sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageStrip",
    "sap/m/MessageToast"
], function (Fragment, MessageStrip, MessageToast) {
    "use strict";

    // Estado global do assistente
    var _oDialog = null;
    var _activeClaimID = null;

    // ================================================================
    // Funções de Chat
    // ================================================================
    function _addMessage(oView, sText, sType) {
        var sCssClass = "sapUiSmallMarginBottom";
        var oMsg = new MessageStrip({
            text: sText,
            type: sType || "Information",
            showIcon: true,
            showCloseButton: false
        }).addStyleClass(sCssClass);

        var oBox = oView.byId("chatMessages") || sap.ui.getCore().byId("chatMessages");
        if (oBox) {
            oBox.addItem(oMsg);
            // Scroll para o final
            setTimeout(function () {
                var oScroll = oView.byId("chatScroll") || sap.ui.getCore().byId("chatScroll");
                if (oScroll) { oScroll.scrollTo(0, 99999); }
            }, 100);
        }
    }

    // ================================================================
    // WebMCP Setup
    // ================================================================
    function _setupWebMCP() {
        var ctx = navigator.modelContext;
        var iRetries = 0;

        function _tryRegister() {
            ctx = navigator.modelContext;
            if (!ctx && iRetries < 15) {
                iRetries++;
                setTimeout(_tryRegister, 600);
                return;
            }
            if (!ctx) {
                console.warn("[WebMCP] navigator.modelContext não disponível.");
                return;
            }
            _registerTools(ctx);
            console.log("[WebMCP] ✅ 3 tools registradas com sucesso.");
        }
        _tryRegister();
    }

    function _registerTools(ctx) {

        // 1. Iniciar Avaria
        ctx.registerTool({
            name: "iniciarAvaria",
            description: "Cria um novo registro de avaria para um cliente específico. Utilize quando o motorista informar o nome do cliente.",
            parameters: {
                type: "object",
                properties: {
                    cliente: { type: "string", description: "Nome do cliente (ex: Supermercado BH)" },
                    motorista: { type: "string", description: "Nome do motorista (opcional)" }
                },
                required: ["cliente"]
            },
            execute: async function (args) {
                var oPayload = {
                    customerName: args.cliente,
                    driverName: args.motorista || "Motorista Logado",
                    status: "PENDING",
                    deliveryDate: new Date().toISOString().split("T")[0]
                };
                var oRes = await fetch("/odata/v4/driver/Claims", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oPayload)
                });
                var oData = await oRes.json();
                _activeClaimID = oData.ID;
                MessageToast.show("Avaria iniciada para " + args.cliente);
                return "Avaria criada com sucesso para " + args.cliente + ". ID: " + oData.ID + ". Agora pode adicionar os itens avariados.";
            }
        });

        // 2. Adicionar Item
        ctx.registerTool({
            name: "adicionarItem",
            description: "Adiciona um item avariado à avaria ativa. Busca o produto pelo nome no catálogo.",
            parameters: {
                type: "object",
                properties: {
                    produto: { type: "string", description: "Nome ou descrição do produto (ex: Leite Integral)" },
                    quantidade: { type: "number", description: "Quantidade avariada" },
                    motivo: { type: "string", description: "Motivo da avaria: DAMAGED (danificado), LEAKING (vazamento) ou EXPIRED (vencido)", enum: ["DAMAGED", "LEAKING", "EXPIRED"] }
                },
                required: ["produto", "quantidade", "motivo"]
            },
            execute: async function (args) {
                if (!_activeClaimID) {
                    return "Erro: Nenhuma avaria ativa. Inicie uma avaria primeiro informando o nome do cliente.";
                }

                // Busca inteligente de produto
                var oProdRes = await fetch("/odata/v4/driver/Products?$filter=contains(description,'" + args.produto + "')");
                var oProdData = await oProdRes.json();

                if (!oProdData.value || oProdData.value.length === 0) {
                    return "Produto '" + args.produto + "' não encontrado no catálogo. Tente um nome diferente.";
                }

                var oMatch = oProdData.value[0];
                var oItemPayload = {
                    parent_ID: _activeClaimID,
                    productID: oMatch.productID,
                    description: oMatch.description,
                    quantity: args.quantidade,
                    reason: args.motivo,
                    price: 1.50,
                    uom: oMatch.uom
                };

                await fetch("/odata/v4/driver/ClaimItems", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oItemPayload)
                });

                MessageToast.show(args.quantidade + "x " + oMatch.description + " adicionado!");
                return "Item adicionado: " + args.quantidade + "x " + oMatch.description + " por motivo " + args.motivo + ".";
            }
        });

        // 3. Finalizar e Resumir
        ctx.registerTool({
            name: "finalizarEResumir",
            description: "Finaliza o registro de avaria atual e apresenta um resumo dos itens registrados.",
            parameters: { type: "object", properties: {} },
            execute: async function () {
                if (!_activeClaimID) {
                    return "Nenhuma avaria ativa para finalizar.";
                }
                var oRes = await fetch("/odata/v4/driver/Claims(" + _activeClaimID + ")?$expand=items");
                var oData = await oRes.json();
                var nTotal = oData.totalAmount || 0;
                var sItens = (oData.items || []).map(function (i) { return i.quantity + "x " + i.description; }).join(", ");

                MessageToast.show("Avaria finalizada! Total: R$ " + nTotal.toFixed(2));
                _activeClaimID = null;
                return "Avaria finalizada. Total: R$ " + nTotal.toFixed(2) + ". Itens: " + sItens + ". A lista será atualizada automaticamente.";
            }
        });
    }

    // ================================================================
    // Reconhecimento de Voz
    // ================================================================
    var _oRecognition = null;
    var _bListening = false;

    function _initVoice() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { return false; }

        _oRecognition = new SpeechRecognition();
        _oRecognition.lang = "pt-BR";
        _oRecognition.continuous = false;
        _oRecognition.interimResults = false;
        return true;
    }

    // ================================================================
    // Handlers Exportados (chamados pela ação do manifest.json)
    // ================================================================
    return {

        onAssistantPress: function () {
            var oView = this.getView ? this.getView() : this._view;

            if (!_oDialog) {
                Fragment.load({
                    id: oView ? oView.getId() : undefined,
                    name: "milksales.smartclaims.motorista.ext.fragment.AssistantDialog",
                    controller: {
                        _sendToAI: async function (sText) {
                            if (!sText) return;
                            _addMessage(oView, "IA está pensando...", "Warning");
                            
                            try {
                                var response = await fetch("/ai/chat", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ message: sText })
                                });
                                var data;
                                try {
                                    data = await response.json();
                                } catch (parseErr) {
                                    data = { error: { message: "Resposta inválida do servidor (limite de cota atingido?)" } };
                                }
                                
                                var sReply = data.value || data.error?.message || "Sem resposta do assistente.";
                                
                                var oBox = sap.ui.getCore().byId(oView ? oView.createId("chatMessages") : "chatMessages");
                                if (oBox) { oBox.removeItem(oBox.getItems().slice(-1)[0]); }
                                
                                _addMessage(oView, "🤖 Gemini: " + sReply, sReply.indexOf("Erro") !== -1 ? "Error" : "Success");
                            } catch (e) {
                                var oBox = sap.ui.getCore().byId(oView ? oView.createId("chatMessages") : "chatMessages");
                                if (oBox) { oBox.removeItem(oBox.getItems().slice(-1)[0]); }
                                _addMessage(oView, "Erro de conexão: " + e.message, "Error");
                            }
                        },

                        onSendMessage: function () {
                            var oInput = sap.ui.getCore().byId(oView ? oView.createId("chatInput") : "chatInput");
                            if (!oInput) return;
                            var sText = oInput.getValue().trim();
                            if (!sText) return;

                            _addMessage(oView, "Você: " + sText, "None");
                            oInput.setValue("");
                            this._sendToAI(sText);
                        },

                        onMicPress: function () {
                            if (!_oRecognition && !_initVoice()) {
                                MessageToast.show("Reconhecimento de voz não suportado neste navegador.");
                                return;
                            }

                            var oMicBtn = sap.ui.getCore().byId(oView ? oView.createId("micButton") : "micButton");
                            var oSelf = this;

                            if (_bListening) {
                                _oRecognition.stop();
                                _bListening = false;
                                if (oMicBtn) { oMicBtn.setType("Emphasized"); }
                                return;
                            }

                            _bListening = true;
                            if (oMicBtn) { oMicBtn.setType("Reject"); }
                            MessageToast.show("Ouvindo... fale agora.");

                            _oRecognition.onresult = function (event) {
                                var sTranscript = event.results[0][0].transcript;
                                _addMessage(oView, "🎤 Você disse: " + sTranscript, "None");
                                _bListening = false;
                                if (oMicBtn) { oMicBtn.setType("Emphasized"); }
                                oSelf._sendToAI(sTranscript);
                            };

                            _oRecognition.onerror = function () {
                                MessageToast.show("Erro no reconhecimento de voz.");
                                _bListening = false;
                                if (oMicBtn) { oMicBtn.setType("Emphasized"); }
                            };

                            _oRecognition.onend = function () {
                                _bListening = false;
                                if (oMicBtn) { oMicBtn.setType("Emphasized"); }
                            };

                            _oRecognition.start();
                        },

                        onClearChat: function () {
                            var oBox = sap.ui.getCore().byId(
                                oView ? oView.createId("chatMessages") : "chatMessages"
                            );
                            if (oBox) { oBox.removeAllItems(); }
                            _addMessage(oView, "Conversa limpa. Como posso ajudar?", "Information");
                        },

                        onCloseAssistant: function () {
                            if (_oDialog) { _oDialog.close(); }
                        }
                    }
                }).then(function (oDialog) {
                    _oDialog = oDialog;
                    if (oView) { oView.addDependent(_oDialog); }
                    _oDialog.open();
                });
            } else {
                _oDialog.open();
            }

            // Registrar WebMCP na primeira abertura
            _setupWebMCP();
        }
    };
});
