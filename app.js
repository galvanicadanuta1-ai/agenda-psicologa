const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2JrY2xvZnNucm9wc3NyYWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODg3NjcsImV4cCI6MjA5Njc2NDc2N30._8_tmYoRlyEhARjXZ3swW8ynCPY5aysGMFCTzgcnK5Y';

let bancoDados;
if (window.supabase) {
    bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro critico: Biblioteca Supabase inacessivel.");
}

let idPacienteEditando = null;
let uploadLogoBase64 = "";
const CHAVE_CONTAS_MANUAIS = 'agenda_contas_manuais_v1';
const CHAVE_PRONTUARIOS_SESSAO = 'agenda_prontuarios_sessao_v1';
let prontuarioSessaoAtual = null;
let arquivosProntuarioSelecionados = [];
let reconhecimentoProntuario = null;

const MAPA_CLASSES_STATUS = {
    'Realizado': 'status-realizado',
    'Falta': 'status-falta',
    'Agendado': 'status-agendado',
    'Cancelado': 'status-cancelado'
};

function chavePagamentoOcorrencia(pacienteId, dataISO) {
    return `pagamento_ocorrencia_${pacienteId}_${dataISO}`;
}

function obterContasManuais() {
    try { return JSON.parse(localStorage.getItem(CHAVE_CONTAS_MANUAIS) || '[]'); } catch { return []; }
}

function salvarContasManuais(contas) {
    localStorage.setItem(CHAVE_CONTAS_MANUAIS, JSON.stringify(contas));
}

function chaveProntuarioSessao(pacienteId, dataISO) {
    return `${pacienteId}_${dataISO}`;
}

function obterProntuariosSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE_PRONTUARIOS_SESSAO) || '{}'); } catch { return {}; }
}

function salvarProntuariosSessao(prontuarios) {
    localStorage.setItem(CHAVE_PRONTUARIOS_SESSAO, JSON.stringify(prontuarios));
}

function contasNoPeriodo(tipo, inicio, fim) {
    const inicioISO = formatarDataISO(inicio);
    const fimISO = formatarDataISO(fim);
    const contas = obterContasManuais();
    const contasPontuais = contas.filter(conta => conta.tipo === tipo && !conta.recorrente && conta.ativo !== false && conta.data >= inicioISO && conta.data <= fimISO);
    const regras = contas.filter(conta => conta.tipo === tipo && conta.recorrente && conta.data <= fimISO);
    const contasRecorrentes = [];

    regras.forEach(regra => {
        const proximaRegra = regras
            .filter(item => item.pacienteId === regra.pacienteId && item.data > regra.data)
            .sort((a, b) => a.data.localeCompare(b.data))[0];
        const limiteISO = proximaRegra ? formatarDataISO(adicionarDias(criarDataLocal(proximaRegra.data), -1)) : fimISO;
        if (!regra.ativo || limiteISO < inicioISO) return;
        const inicioRegra = criarDataLocal(regra.data);
        const limite = criarDataLocal(limiteISO);
        const primeiroDia = criarDataLocal(inicioISO) > inicioRegra ? criarDataLocal(inicioISO) : inicioRegra;
        const totalDias = Math.round((limite.getTime() - primeiroDia.getTime()) / (1000 * 60 * 60 * 24));

        for (let i = 0; i <= totalDias; i++) {
            const dataFoco = adicionarDias(primeiroDia, i);
            const dataISO = formatarDataISO(dataFoco);
            if (!checarDataCorrespondeAoPlano(dataFoco, regra.data, regra.diaSemana, regra.frequencia)) continue;
            const origemPontual = chaveOrigemContaPagar(regra.pacienteId, dataISO);
            if (contas.some(conta => !conta.recorrente && conta.tipo === tipo && conta.origem === origemPontual)) continue;
            const chavePagamento = `pagamento_conta_${regra.id}_${dataISO}`;
            contasRecorrentes.push({
                ...regra,
                id: `${regra.id}_${dataISO}`,
                contaId: regra.id,
                data: dataISO,
                recorrente: true,
                chavePagamento,
                pago: localStorage.getItem(chavePagamento) === 'true'
            });
        }
    });
    return contasPontuais.concat(contasRecorrentes).sort((a, b) => a.data.localeCompare(b.data));
}

function totalizarContas(contas, somenteEmAberto = false) {
    return contas.filter(conta => !somenteEmAberto || !conta.pago).reduce((total, conta) => total + Number(conta.valor || 0), 0);
}

function carregarStatusPagamentoOcorrencia(pacienteId, dataISO) {
    const campoPago = document.getElementById('valorOcorrenciaPago');
    if (!campoPago) return;
    campoPago.checked = pacienteId && dataISO ? localStorage.getItem(chavePagamentoOcorrencia(pacienteId, dataISO)) === 'true' : false;
}

function salvarStatusPagamentoOcorrencia(pacienteId, dataISO) {
    const campoPago = document.getElementById('valorOcorrenciaPago');
    if (!campoPago || !pacienteId || !dataISO) return;
    localStorage.setItem(chavePagamentoOcorrencia(pacienteId, dataISO), campoPago.checked ? 'true' : 'false');
}

function formatarDataISO(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function criarDataLocal(dataISO) {
    if (!dataISO) return null;
    const partes = dataISO.split('-');
    if (partes.length !== 3) return null;
    const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return isNaN(data.getTime()) ? null : data;
}

function adicionarDias(data, dias) {
    const novaData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    novaData.setDate(novaData.getDate() + dias);
    return novaData;
}

function normalizarData(data) {
    const novaData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    novaData.setHours(0, 0, 0, 0);
    return novaData;
}

function formatarDataBR(data) {
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escaparHTML(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[caractere]);
}

function obterPeriodoMesAtual() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio, fim };
}

function alternarSubmenuPacientes() {
    const sub = document.getElementById('submenuPacientes');
    if (sub) sub.style.display = (sub.style.display === 'flex') ? 'none' : 'flex';
}
window.alternarSubmenuPacientes = alternarSubmenuPacientes;

function alternarSubmenuFinanceiro() {
    const submenu = document.getElementById('submenuFinanceiro');
    if (submenu) submenu.classList.toggle('aberto');
}
window.alternarSubmenuFinanceiro = alternarSubmenuFinanceiro;

function acionarMenuNovoPaciente() {
    idPacienteEditando = null;
    mostrarTela('novoPaciente');
}
window.acionarMenuNovoPaciente = acionarMenuNovoPaciente;

function mostrarTela(nomeTela) {
    fecharMenuMobile();
    document.querySelectorAll('.tela').forEach(tela => tela.style.display = 'none');
    const telaAlvo = document.getElementById(nomeTela);
    if (telaAlvo) telaAlvo.style.display = 'block';

    const sidePerfil = document.getElementById('sidebar-agenda-paciente');
    if (sidePerfil) sidePerfil.style.display = 'none';

    const btnExcluirForm = document.getElementById('btnExcluirPacienteForm');
    if (btnExcluirForm) {
        btnExcluirForm.style.display = (nomeTela === 'novoPaciente' && idPacienteEditando) ? 'inline-block' : 'none';
    }

    const titulosModulos = {
        'dashboard': 'Agenda',
        'pacientes': 'Pacientes',
        'relatorios': 'Relatorios',
        'contasReceber': 'Contas a Receber',
        'contasPagar': 'Contas a Pagar',
        'novoPaciente': idPacienteEditando ? 'Perfil e Historico Clinico' : 'Cadastro de Novo Paciente',
        'configuracoes': 'Configuracoes do Sistema'
    };

    const elTituloSecao = document.getElementById('tituloSecao');
    if (elTituloSecao) elTituloSecao.innerText = titulosModulos[nomeTela] || 'Painel';

    switch (nomeTela) {
        case 'dashboard':
            atualizarDashboard();
            carregarAgendaSemanal();
            break;
        case 'pacientes':
            carregarPacientes();
            break;
        case 'relatorios':
            carregarTelaRelatorios();
            break;
        case 'contasReceber':
            carregarTelaContas('receber');
            break;
        case 'contasPagar':
            carregarTelaContas('pagar');
            break;
        case 'novoPaciente':
            if (!idPacienteEditando) {
                document.getElementById('formPaciente')?.reset();
                if (document.getElementById('statusVinculo')) document.getElementById('statusVinculo').value = 'Ativo';
                const elDia = document.getElementById('diaSemana');
                if (elDia) elDia.value = 'Segunda';
                configurarPeriodoPadraoSidebar();
                renderizarSidebarCalendarioPaciente(null);
            }
            break;
        case 'configuracoes':
            carregarConfiguracoesCampos();
            break;
    }
}
window.mostrarTela = mostrarTela;

function alternarMenuMobile() {
    document.body.classList.toggle('menu-mobile-aberto');
}
window.alternarMenuMobile = alternarMenuMobile;

function fecharMenuMobile() {
    document.body.classList.remove('menu-mobile-aberto');
}
window.fecharMenuMobile = fecharMenuMobile;

window.addEventListener('load', () => {
    aplicarConfiguracoesVisuais();
    mostrarTela('dashboard');
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnSalvarPaciente')?.addEventListener('click', salvarPaciente);
    document.getElementById('btnSalvarConfiguracoes')?.addEventListener('click', salvarConfiguracoes);
    document.getElementById('btnAplicarPeriodoPaciente')?.addEventListener('click', () => renderizarSidebarCalendarioPaciente(idPacienteEditando, true));
    document.getElementById('btnGerarRelatorio')?.addEventListener('click', gerarRelatorioFinanceiro);
    document.getElementById('btnGerarPdfRelatorio')?.addEventListener('click', gerarPdfRelatorio);
    document.getElementById('arquivosProntuarioSessao')?.addEventListener('change', atualizarArquivosProntuarioSelecionados);
    document.getElementById('btnDitadoProntuario')?.addEventListener('click', alternarDitadoProntuario);

    document.getElementById('dataInicial')?.addEventListener('change', () => {
        atualizarDiaSemanaAutomatico();
        configurarPeriodoPadraoSidebar();
        renderizarSidebarCalendarioPaciente(idPacienteEditando);
    });

    ['frequencia', 'horario', 'modalidade', 'valor'].forEach(campoId => {
        document.getElementById(campoId)?.addEventListener('change', () => {
            renderizarSidebarCalendarioPaciente(idPacienteEditando);
        });
    });

    document.getElementById('cfgLogoFile')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                uploadLogoBase64 = evt.target.result;
                const urlInput = document.getElementById('cfgLogoUrl');
                if (urlInput) urlInput.value = "(Arquivo local anexado)";
            };
            reader.readAsDataURL(file);
        }
    });
});

function atualizarDiaSemanaAutomatico() {
    const inputData = document.getElementById('dataInicial');
    if (!inputData || !inputData.value) return;
    const dataObjeto = criarDataLocal(inputData.value);
    if (!dataObjeto) return;
    const diasDaSemana = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
    const selectDia = document.getElementById('diaSemana');
    if (selectDia) {
        selectDia.removeAttribute('disabled');
        selectDia.value = diasDaSemana[dataObjeto.getDay()];
        selectDia.setAttribute('disabled', 'true');
    }
}

function checarDataCorrespondeAoPlano(dataAlvoObj, dataInicioStr, diaSemanaPlan, frequenciaPlan) {
    if (!dataInicioStr) return false;
    const dataInicioObj = criarDataLocal(dataInicioStr);
    if (!dataInicioObj) return false;

    const dataAlvo = normalizarData(dataAlvoObj);
    const dataInicio = normalizarData(dataInicioObj);
    if (dataAlvo < dataInicio) return false;

    const diferencaTime = dataAlvo.getTime() - dataInicio.getTime();
    const diferencaDias = Math.round(diferencaTime / (1000 * 60 * 60 * 24));
    if (diferencaDias % 7 !== 0) return false;
    const diferencaSemanas = diferencaDias / 7;
    if (frequenciaPlan === 'Semanal') return true;
    if (frequenciaPlan === 'Quinzenal') return diferencaSemanas % 2 === 0;
    if (frequenciaPlan === 'Mensal') return diferencaSemanas % 4 === 0;
    return false;
}

async function carregarAgendaSemanal() {
    const containerGeral = document.getElementById('grade-agenda-container');
    if (!containerGeral) return;
    containerGeral.innerHTML = '<div style="padding: 10px;">Carregando compromissos organizados...</div>';

    if (!bancoDados) return;

    try {
        const { data: pacientes } = await bancoDados.from('pacientes').select('id, nome');
        const { data: planos } = await bancoDados.from('planos_atendimento').select('*').eq('ativo', true);
        const { data: agendamentos } = await bancoDados.from('agendamentos').select('*');

        const mapaPacientes = {};
        if (pacientes) pacientes.forEach(p => mapaPacientes[p.id] = p.nome);

        const hoje = new Date();
        const diaSemanaAtual = hoje.getDay();
        const diffSegunda = diaSemanaAtual === 0 ? -6 : 1 - diaSemanaAtual;

        const segundaCorrente = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        segundaCorrente.setDate(segundaCorrente.getDate() + diffSegunda);

        let htmlSemanas = '';
        const nomesDiasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
        const classesDias = ['dia-seg', 'dia-ter', 'dia-qua', 'dia-qui', 'dia-sex', 'dia-sab', 'dia-dom'];

        for (let s = 0; s < 5; s++) {
            const dataInicioBloco = adicionarDias(segundaCorrente, s * 7);
            const dataFimBloco = adicionarDias(dataInicioBloco, 6);

            let dadosSemanaCorrente = [];
            let maxPacientesNaSemana = 1;

            for (let d = 0; d < 7; d++) {
                const dataDiaCell = adicionarDias(dataInicioBloco, d);
                const dataISOChave = formatarDataISO(dataDiaCell);

                let itensDoDia = [];
                const especificosHoje = agendamentos ? agendamentos.filter(a => a.data === dataISOChave) : [];

                especificosHoje.forEach(esp => {
                    if (mapaPacientes[esp.paciente_id] && esp.status !== 'Cancelado') {
                        const planoOrigem = planos ? planos.find(pl => pl.paciente_id === esp.paciente_id) : null;
                        itensDoDia.push({
                            id: esp.id,
                            pacienteId: esp.paciente_id,
                            nome: mapaPacientes[esp.paciente_id],
                            hora: esp.hora ? esp.hora.substring(0, 5) : '--:--',
                            modalidade: esp.modalidade || (planoOrigem ? planoOrigem.modalidade : 'Presencial'),
                            valor: esp.valor || (planoOrigem ? planoOrigem.valor : 0),
                            status: esp.status || 'Agendado'
                        });
                    }
                });

                if (planos) {
                    planos.forEach(plano => {
                        const possuiExcecaoHoje = especificosHoje.some(e => e.paciente_id === plano.paciente_id);
                        if (!possuiExcecaoHoje && mapaPacientes[plano.paciente_id]) {
                            const corresponde = checarDataCorrespondeAoPlano(new Date(dataDiaCell), plano.data_inicio, plano.dia_semana, plano.frequencia);
                            if (corresponde) {
                                itensDoDia.push({
                                    id: null,
                                    pacienteId: plano.paciente_id,
                                    nome: mapaPacientes[plano.paciente_id],
                                    hora: plano.hora_padrao ? plano.hora_padrao.substring(0, 5) : '--:--',
                                    modalidade: plano.modalidade || 'Presencial',
                                    valor: plano.valor || 0,
                                    status: 'Agendado'
                                });
                            }
                        }
                    });
                }

                dadosSemanaCorrente.push({
                    dataISO: dataISOChave,
                    itens: itensDoDia,
                    tituloTexto: `${nomesDiasSemana[d].toLowerCase().substring(0, 3)}. ${formatarDataBR(dataDiaCell)}`,
                    classeCor: classesDias[d]
                });

                if (itensDoDia.length > maxPacientesNaSemana) {
                    maxPacientesNaSemana = itensDoDia.length;
                }
            }

            htmlSemanas += `
                <div class="semana-bloco">
                    <div class="semana-titulo">Agenda da Semana: ${formatarDataBR(dataInicioBloco)} a ${formatarDataBR(dataFimBloco)}</div>
                    <div class="agenda-desktop"><div class="grade-agenda">
            `;

            dadosSemanaCorrente.forEach(dia => {
                htmlSemanas += `<div class="coluna-dia-titulo ${dia.classeCor}">${dia.tituloTexto}</div>`;
            });

            dadosSemanaCorrente.forEach(dia => {
                htmlSemanas += `<div class="coluna-dia-conteudo">`;

                for (let r = 0; r < maxPacientesNaSemana; r++) {
                    const compromisso = dia.itens[r];
                    if (compromisso) {
                        const classeStatus = MAPA_CLASSES_STATUS[compromisso.status] || 'status-agendado';

                        htmlSemanas += `
                            <div class="card-compromisso ${classeStatus}">
                                <div class="card-paciente-nome">${compromisso.nome}</div>
                                <div class="card-paciente-hora">${compromisso.hora} - ${compromisso.modalidade}</div>
                                ${compromisso.status !== 'Agendado' ? `<div class="card-paciente-status-badge"><span>${compromisso.status}</span></div>` : ''}
                                <button class="btn-tres-pontos-agenda" title="Editar esta data" onclick="abrirEditorDiretoAgenda('${compromisso.pacienteId}', '${dia.dataISO}', '${compromisso.hora}', '${compromisso.modalidade}', '${compromisso.valor}', '${compromisso.status}')">...</button>
                            </div>
                        `;
                    } else {
                        htmlSemanas += `<div class="card-compromisso cell-vazia">&nbsp;</div>`;
                    }
                }

                htmlSemanas += `</div>`;
            });

            htmlSemanas += `</div></div><div class="agenda-mobile">`;
            dadosSemanaCorrente.forEach(dia => {
                htmlSemanas += `<section class="agenda-mobile-dia"><h4 class="${dia.classeCor}">${dia.tituloTexto}</h4>`;
                if (dia.itens.length === 0) {
                    htmlSemanas += `<div class="agenda-mobile-vazio">Sem atendimentos</div>`;
                } else {
                    dia.itens.forEach(compromisso => {
                        const classeStatus = MAPA_CLASSES_STATUS[compromisso.status] || 'status-agendado';
                        htmlSemanas += `<div class="card-compromisso ${classeStatus}"><div class="card-paciente-nome">${compromisso.nome}</div><div class="card-paciente-hora">${compromisso.hora} - ${compromisso.modalidade}</div>${compromisso.status !== 'Agendado' ? `<div class="card-paciente-status-badge"><span>${compromisso.status}</span></div>` : ''}<button class="btn-tres-pontos-agenda" title="Editar esta data" onclick="abrirEditorDiretoAgenda('${compromisso.pacienteId}', '${dia.dataISO}', '${compromisso.hora}', '${compromisso.modalidade}', '${compromisso.valor}', '${compromisso.status}')">...</button></div>`;
                    });
                }
                htmlSemanas += `</section>`;
            });
            htmlSemanas += `</div></div>`;
        }
        containerGeral.innerHTML = htmlSemanas;
    } catch (err) {
        console.error(err);
    }
}

window.abrirEditorDiretoAgenda = function(pacienteId, dataISO, hora, modalidade, valor, status) {
    const modal = document.getElementById('modalAgendamento');
    if (!modal) return;

    document.getElementById('modalAgendamentoTitulo').innerText = "Editar Ocorrencia";
    document.getElementById('containerSelectPacienteAgendamento').style.display = 'none';
    document.getElementById('boxEscopoAgenda').style.display = 'block';

    document.getElementById('selectPacienteAgendamento').value = pacienteId;
    document.getElementById('dataAgendamento').value = dataISO;
    document.getElementById('horaAgendamento').value = hora;
    document.getElementById('modalidadeAgendamento').value = modalidade;
    document.getElementById('valorAgendamento').value = valor;
    document.getElementById('statusAgendamento').value = status;
    carregarStatusPagamentoOcorrencia(pacienteId, dataISO);
    document.getElementById('btnAbrirProntuario').onclick = () => abrirProntuarioSessao(pacienteId, dataISO);
    const campoFrequencia = document.getElementById('frequenciaAgendamento');
    if (campoFrequencia) {
        campoFrequencia.value = 'Semanal';
        campoFrequencia.dataset.original = 'Semanal';
        bancoDados?.from('planos_atendimento').select('frequencia').eq('paciente_id', pacienteId).then(resposta => {
            const frequencia = resposta.data?.[0]?.frequencia || 'Semanal';
            campoFrequencia.value = frequencia;
            campoFrequencia.dataset.original = frequencia;
        });
    }
    carregarContaPagarOcorrencia(pacienteId, dataISO);

    document.getElementById('btnPersistirAgendamento').onclick = async function() {
        let escopo = document.getElementById('escopoModificacaoAgenda').value;
        const novaData = document.getElementById('dataAgendamento').value;
        const novaHora = document.getElementById('horaAgendamento').value;
        const novaMod = document.getElementById('modalidadeAgendamento').value;
        const novoVal = Number(document.getElementById('valorAgendamento').value || 0);
        const novoStat = document.getElementById('statusAgendamento').value;
        const novaFreq = document.getElementById('frequenciaAgendamento')?.value || 'Semanal';
        if (novaFreq !== document.getElementById('frequenciaAgendamento')?.dataset.original) escopo = 'demais';
        if (!validarContaPagarOcorrencia()) return;

        await executarSalvamentoPorEscopo(pacienteId, dataISO, novaData, novaHora, novaMod, novoVal, novoStat, escopo, novaFreq);
        salvarStatusPagamentoOcorrencia(pacienteId, novaData);
        await salvarContaPagarOcorrencia(pacienteId, dataISO, novaData, escopo, novaFreq);
        if (novaData !== dataISO) {
            localStorage.removeItem(chavePagamentoOcorrencia(pacienteId, dataISO));
        }
        fecharModalAgendamento();
        carregarAgendaSemanal();
        renderizarSidebarCalendarioPaciente(idPacienteEditando, true);
    };

    modal.style.display = 'flex';
};

window.fecharModalAgendamento = function() {
    const modal = document.getElementById('modalAgendamento');
    if (modal) modal.style.display = 'none';
};

async function abrirProntuarioSessao(pacienteId, dataISO) {
    const modal = document.getElementById('modalProntuario');
    const campoTexto = document.getElementById('textoProntuarioSessao');
    const identificacao = document.getElementById('prontuarioIdentificacao');
    if (!modal || !campoTexto || !identificacao) return;

    prontuarioSessaoAtual = { pacienteId, dataISO };
    arquivosProntuarioSelecionados = [];
    const inputArquivos = document.getElementById('arquivosProntuarioSessao');
    if (inputArquivos) inputArquivos.value = '';
    atualizarListaArquivosProntuario();

    const registro = obterProntuariosSessao()[chaveProntuarioSessao(pacienteId, dataISO)];
    campoTexto.value = registro?.texto || '';
    identificacao.innerText = `Sessao de ${formatarDataBR(criarDataLocal(dataISO))}`;
    if (bancoDados) {
        const resposta = await bancoDados.from('pacientes').select('nome').eq('id', pacienteId);
        const nome = resposta.data?.[0]?.nome;
        if (nome) identificacao.innerText = `${nome} - Sessao de ${formatarDataBR(criarDataLocal(dataISO))}`;
    }
    modal.style.display = 'flex';
}
window.abrirProntuarioSessao = abrirProntuarioSessao;

function fecharProntuarioSessao() {
    if (reconhecimentoProntuario) reconhecimentoProntuario.stop();
    const modal = document.getElementById('modalProntuario');
    if (modal) modal.style.display = 'none';
}
window.fecharProntuarioSessao = fecharProntuarioSessao;

function atualizarArquivosProntuarioSelecionados(evento) {
    arquivosProntuarioSelecionados = Array.from(evento.target.files || []).map(arquivo => ({
        nome: arquivo.name,
        tamanho: arquivo.size,
        tipo: arquivo.type || 'Arquivo'
    }));
    atualizarListaArquivosProntuario();
}

function atualizarListaArquivosProntuario() {
    const lista = document.getElementById('listaArquivosProntuario');
    if (!lista) return;
    if (arquivosProntuarioSelecionados.length === 0) {
        lista.innerText = 'Nenhum arquivo selecionado.';
        return;
    }
    lista.innerHTML = arquivosProntuarioSelecionados.map(arquivo => `<div>📎 ${escaparHTML(arquivo.nome)} <span>(${Math.ceil(arquivo.tamanho / 1024)} KB)</span></div>`).join('');
}

function salvarProntuarioSessao() {
    if (!prontuarioSessaoAtual) return;
    const campoTexto = document.getElementById('textoProntuarioSessao');
    const prontuarios = obterProntuariosSessao();
    prontuarios[chaveProntuarioSessao(prontuarioSessaoAtual.pacienteId, prontuarioSessaoAtual.dataISO)] = {
        texto: campoTexto?.value || '',
        atualizadoEm: new Date().toISOString()
    };
    salvarProntuariosSessao(prontuarios);
    alert('Prontuario de teste salvo neste navegador. Os anexos serao habilitados quando o armazenamento privado em nuvem for configurado.');
    fecharProntuarioSessao();
}
window.salvarProntuarioSessao = salvarProntuarioSessao;

function alternarDitadoProntuario() {
    const campoTexto = document.getElementById('textoProntuarioSessao');
    const botao = document.getElementById('btnDitadoProntuario');
    if (!campoTexto || !botao) return;
    const APIReconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!APIReconhecimento) {
        alert('O reconhecimento de voz nao e compativel com este navegador. Tente abrir no Google Chrome ou Microsoft Edge.');
        return;
    }
    if (reconhecimentoProntuario) {
        reconhecimentoProntuario.stop();
        return;
    }
    reconhecimentoProntuario = new APIReconhecimento();
    reconhecimentoProntuario.lang = 'pt-BR';
    reconhecimentoProntuario.continuous = true;
    reconhecimentoProntuario.interimResults = true;
    let textoFinal = '';
    reconhecimentoProntuario.onstart = () => { botao.innerText = '⏹️ Parar ditado'; };
    reconhecimentoProntuario.onresult = evento => {
        let textoParcial = '';
        for (let i = evento.resultIndex; i < evento.results.length; i++) {
            const texto = evento.results[i][0].transcript;
            if (evento.results[i].isFinal) textoFinal += texto + ' ';
            else textoParcial += texto;
        }
        campoTexto.value = `${campoTexto.dataset.baseDitado || campoTexto.value}${textoFinal}${textoParcial}`;
    };
    reconhecimentoProntuario.onend = () => {
        reconhecimentoProntuario = null;
        campoTexto.dataset.baseDitado = '';
        botao.innerText = '🎙️ Iniciar ditado';
    };
    campoTexto.dataset.baseDitado = campoTexto.value ? `${campoTexto.value.trim()} ` : '';
    reconhecimentoProntuario.start();
}
window.alternarDitadoProntuario = alternarDitadoProntuario;

function configurarPeriodoPadraoSidebar() {
    const inicioInput = document.getElementById('periodoConsultaInicio');
    const fimInput = document.getElementById('periodoConsultaFim');
    if (!inicioInput || !fimInput) return;

    const dataInicialPlano = document.getElementById('dataInicial')?.value;
    const hoje = normalizarData(new Date());
    const limiteFuturo = adicionarDias(hoje, 90);

    inicioInput.value = dataInicialPlano || formatarDataISO(hoje);
    fimInput.value = formatarDataISO(limiteFuturo);
    fimInput.max = formatarDataISO(limiteFuturo);
}

function obterPeriodoConsultaPaciente() {
    const inicioInput = document.getElementById('periodoConsultaInicio');
    const fimInput = document.getElementById('periodoConsultaFim');
    const aviso = document.getElementById('aviso-periodo-paciente');
    const hoje = normalizarData(new Date());
    const limiteFuturo = adicionarDias(hoje, 90);

    if (!inicioInput || !fimInput) return null;

    if (!inicioInput.value || !fimInput.value) {
        configurarPeriodoPadraoSidebar();
    }

    let dataInicio = criarDataLocal(inicioInput.value);
    let dataFim = criarDataLocal(fimInput.value);
    let mensagem = '';

    if (!dataInicio || !dataFim) {
        dataInicio = hoje;
        dataFim = limiteFuturo;
        inicioInput.value = formatarDataISO(dataInicio);
        fimInput.value = formatarDataISO(dataFim);
        mensagem = 'Periodo invalido. Ajustei para hoje ate 90 dias a frente.';
    }

    dataInicio = normalizarData(dataInicio);
    dataFim = normalizarData(dataFim);

    if (dataFim > limiteFuturo) {
        dataFim = limiteFuturo;
        fimInput.value = formatarDataISO(limiteFuturo);
        mensagem = 'Para datas futuras, a consulta foi limitada a 90 dias a partir de hoje.';
    }

    if (dataInicio > dataFim) {
        const ajuste = dataInicio;
        dataInicio = dataFim;
        dataFim = ajuste;
        inicioInput.value = formatarDataISO(dataInicio);
        fimInput.value = formatarDataISO(dataFim);
        mensagem = 'A data inicial estava maior que a final. Invertemos o periodo automaticamente.';
    }

    fimInput.max = formatarDataISO(limiteFuturo);
    if (aviso) aviso.innerText = mensagem;

    return { dataInicio, dataFim };
}

async function renderizarSidebarCalendarioPaciente(pacienteId, manterPeriodoAtual = false) {
    const sidebar = document.getElementById('sidebar-agenda-paciente');
    const resumoBox = document.getElementById('info-plano-resumo');
    const listaScroll = document.getElementById('lista-proximas-sessoes');
    if (!sidebar || !resumoBox || !listaScroll) return;

    const dataInicioStr = document.getElementById('dataInicial')?.value;
    const frequencia = document.getElementById('frequencia')?.value || 'Semanal';
    const horaPadrao = document.getElementById('horario')?.value || '';
    const modalidade = document.getElementById('modalidade')?.value || 'Presencial';
    const valor = Number(document.getElementById('valor')?.value || 0);
    const diaSemana = document.getElementById('diaSemana')?.value || 'Segunda';

    if (!dataInicioStr) {
        sidebar.style.display = 'none';
        return;
    }

    sidebar.style.display = 'block';
    if (!manterPeriodoAtual) configurarPeriodoPadraoSidebar();
    const periodo = obterPeriodoConsultaPaciente();
    if (!periodo) return;
    const contasPagarPeriodo = contasNoPeriodo('pagar', periodo.dataInicio, periodo.dataFim)
        .filter(conta => String(conta.pacienteId) === String(pacienteId));

    const horaExibResumo = horaPadrao ? horaPadrao.substring(0, 5) : '--:--';
    resumoBox.innerHTML = `
        <strong>Frequencia Atual:</strong> ${frequencia}<br>
        <strong>Horario Fixo:</strong> ${horaExibResumo}<br>
        <strong>Modalidade Base:</strong> ${modalidade}<br>
        <strong>Valor Base:</strong> R$ ${valor.toFixed(2)}
    `;

    listaScroll.innerHTML = '<div style="font-size:12px; padding:10px;">Processando periodo...</div>';

    try {
        let agendamentos = [];
        if (pacienteId && pacienteId !== 'null' && bancoDados) {
            const res = await bancoDados
                .from('agendamentos')
                .select('*')
                .eq('paciente_id', pacienteId)
                .gte('data', formatarDataISO(periodo.dataInicio))
                .lte('data', formatarDataISO(periodo.dataFim));
            if (res.data) agendamentos = res.data;
        }

        let htmlProxe = '';
        const dataBaseLoop = criarDataLocal(dataInicioStr);

        if (!dataBaseLoop) {
            listaScroll.innerHTML = '<div style="font-size:12px; color:#e53e3e; padding:10px;">Data de inicio invalida.</div>';
            return;
        }

        const totalDias = Math.round((periodo.dataFim.getTime() - periodo.dataInicio.getTime()) / (1000 * 60 * 60 * 24));

        for (let i = 0; i <= totalDias; i++) {
            const dataFoco = adicionarDias(periodo.dataInicio, i);
            const dataISO = formatarDataISO(dataFoco);
            const atendeRecorrencia = checarDataCorrespondeAoPlano(new Date(dataFoco), dataInicioStr, diaSemana, frequencia);
            const excecao = agendamentos.find(a => a.data === dataISO);

            if (atendeRecorrencia || excecao) {
                const exibData = formatarDataBR(dataFoco);
                const exibHora = excecao ? (excecao.hora ? excecao.hora.substring(0, 5) : '--:--') : (horaPadrao ? horaPadrao.substring(0, 5) : '--:--');
                const exibValor = excecao && excecao.valor !== undefined ? excecao.valor : valor;
                const exibMod = excecao && excecao.modalidade ? excecao.modalidade : modalidade;
                const exibStatus = excecao ? excecao.status : 'Agendado';
                const classeStatusSide = MAPA_CLASSES_STATUS[exibStatus] || 'status-agendado';
                const pago = localStorage.getItem(chavePagamentoOcorrencia(pacienteId, dataISO)) === 'true';
                const contasDaData = contasPagarPeriodo.filter(conta => conta.data === dataISO);
                const textoContasPagar = contasDaData.map(conta => {
                    const descricao = conta.categoria === 'Outro' ? conta.descricao : conta.categoria;
                    return `<div class="linha-conta-pagar">Conta a Pagar: <b>${escaparHTML(descricao || 'Outro')}</b> | R$ ${Number(conta.valor || 0).toFixed(2)}${conta.pago ? ' | Pago' : ''}</div>`;
                }).join('');

                htmlProxe += `
                    <div class="container-linha-bloco ${classeStatusSide}">
                        <div class="linha-data">${exibData} as ${exibHora} - ${exibMod}</div>
                        <div class="linha-status">Status: <b>${exibStatus}</b> | R$ ${Number(exibValor).toFixed(2)}${pago ? ' | Pago' : ''}</div>
                        ${textoContasPagar}
                        <button class="btn-tres-pontos-sidebar" title="Editar esta data" onclick="abrirEditorDiretoAgenda('${pacienteId}', '${dataISO}', '${exibHora}', '${exibMod}', '${Number(exibValor)}', '${exibStatus}')">...</button>
                    </div>
                `;
            }
        }

        listaScroll.innerHTML = htmlProxe || '<div style="font-size:12px; color:#718096; padding:10px;">Nenhuma sessao encontrada neste periodo.</div>';
    } catch (err) {
        console.error(err);
        listaScroll.innerHTML = '<div style="font-size:12px; color:#e53e3e; padding:10px;">Erro ao processar consulta do calendario.</div>';
    }
}

async function executarSalvamentoPorEscopo(pacienteId, dataOriginalISO, novaDataISO, novaHora, novaMod, novoVal, statusSessao, escopo, novaFreq) {
    if (!bancoDados) return;
    try {
        if (escopo === 'somente') {
            const payload = { paciente_id: pacienteId, data: novaDataISO, hora: novaHora, modalidade: novaMod, valor: novoVal, status: statusSessao };
            if (novaDataISO !== dataOriginalISO) {
                await bancoDados.from('agendamentos').insert([{ paciente_id: pacienteId, data: dataOriginalISO, hora: novaHora, status: 'Cancelado', modalidade: novaMod, valor: novoVal }]);
            }
            const { data: extNova } = await bancoDados.from('agendamentos').select('id').eq('paciente_id', pacienteId).eq('data', novaDataISO);
            if (extNova && extNova.length > 0) {
                await bancoDados.from('agendamentos').update(payload).eq('id', extNova[0].id);
            } else {
                await bancoDados.from('agendamentos').insert([payload]);
            }
        } else {
            const objData = criarDataLocal(novaDataISO);
            const diasTexto = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
            const payloadPlano = { data_inicio: novaDataISO, dia_semana: diasTexto[objData.getDay()], hora_padrao: novaHora, valor: novoVal, modalidade: novaMod };
            if (novaFreq) payloadPlano.frequencia = novaFreq;
            await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', pacienteId);
            await bancoDados.from('agendamentos').delete().eq('paciente_id', pacienteId).gte('data', dataOriginalISO);
        }
        alert('Modificacoes salvas com sucesso!');
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar modificacoes.');
    }
}


async function buscarBaseFinanceira() {
    if (!bancoDados) return null;
    const { data: pacientes } = await bancoDados.from('pacientes').select('id, nome, status').order('nome');
    const { data: planos } = await bancoDados.from('planos_atendimento').select('*').eq('ativo', true);
    const { data: agendamentos } = await bancoDados.from('agendamentos').select('*');
    return {
        pacientes: pacientes || [],
        planos: planos || [],
        agendamentos: agendamentos || []
    };
}

function montarOcorrenciasFinanceiras(base, dataInicio, dataFim, pacienteFiltro = '') {
    if (!base || !dataInicio || !dataFim) return [];
    const pacientesAtivos = base.pacientes.filter(p => p.status !== 'Inativo');
    const mapaPacientes = {};
    pacientesAtivos.forEach(p => mapaPacientes[p.id] = p.nome || 'Paciente sem nome');

    const ocorrencias = [];
    const totalDias = Math.round((normalizarData(dataFim).getTime() - normalizarData(dataInicio).getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= totalDias; i++) {
        const dataFoco = adicionarDias(dataInicio, i);
        const dataISO = formatarDataISO(dataFoco);
        const especificosDia = base.agendamentos.filter(a => a.data === dataISO);

        especificosDia.forEach(ag => {
            if (!mapaPacientes[ag.paciente_id]) return;
            if (pacienteFiltro && String(ag.paciente_id) !== String(pacienteFiltro)) return;
            if (ag.status === 'Cancelado') return;

            const planoOrigem = base.planos.find(pl => pl.paciente_id === ag.paciente_id) || {};
            const valor = Number(ag.valor ?? planoOrigem.valor ?? 0);
            const pago = localStorage.getItem(chavePagamentoOcorrencia(ag.paciente_id, dataISO)) === 'true';

            ocorrencias.push({
                pacienteId: ag.paciente_id,
                pacienteNome: mapaPacientes[ag.paciente_id],
                dataISO,
                dataObj: dataFoco,
                hora: ag.hora ? ag.hora.substring(0, 5) : (planoOrigem.hora_padrao ? planoOrigem.hora_padrao.substring(0, 5) : '--:--'),
                modalidade: ag.modalidade || planoOrigem.modalidade || 'Presencial',
                valor,
                status: ag.status || 'Agendado',
                pago
            });
        });

        base.planos.forEach(plano => {
            if (!mapaPacientes[plano.paciente_id]) return;
            if (pacienteFiltro && String(plano.paciente_id) !== String(pacienteFiltro)) return;
            const possuiExcecao = especificosDia.some(e => e.paciente_id === plano.paciente_id);
            if (possuiExcecao) return;
            if (!checarDataCorrespondeAoPlano(new Date(dataFoco), plano.data_inicio, plano.dia_semana, plano.frequencia)) return;

            const pago = localStorage.getItem(chavePagamentoOcorrencia(plano.paciente_id, dataISO)) === 'true';
            ocorrencias.push({
                pacienteId: plano.paciente_id,
                pacienteNome: mapaPacientes[plano.paciente_id],
                dataISO,
                dataObj: dataFoco,
                hora: plano.hora_padrao ? plano.hora_padrao.substring(0, 5) : '--:--',
                modalidade: plano.modalidade || 'Presencial',
                valor: Number(plano.valor || 0),
                status: 'Agendado',
                pago
            });
        });
    }

    return ocorrencias.sort((a, b) => a.dataISO.localeCompare(b.dataISO) || a.pacienteNome.localeCompare(b.pacienteNome));
}

function calcularTotaisFinanceiros(ocorrencias) {
    const previsto = ocorrencias.reduce((total, item) => total + Number(item.valor || 0), 0);
    const recebido = ocorrencias.filter(item => item.pago).reduce((total, item) => total + Number(item.valor || 0), 0);
    // Todo atendimento previsto e ainda nao marcado como pago compoe o valor a receber,
    // inclusive os que ainda ocorrerao dentro do periodo selecionado.
    const aReceber = ocorrencias
        .filter(item => !item.pago)
        .reduce((total, item) => total + Number(item.valor || 0), 0);
    return { previsto, recebido, aReceber };
}

function transformarContasReceberEmLinhas(contas) {
    return contas.map(conta => ({
        pacienteId: '', pacienteNome: conta.descricao || 'Conta manual', dataISO: conta.data,
        dataObj: criarDataLocal(conta.data), hora: '--:--', modalidade: 'Manual', valor: Number(conta.valor || 0),
        status: 'Conta a receber', pago: Boolean(conta.pago), tipoConta: 'receber', contaId: conta.id
    }));
}

function transformarContasPagarEmLinhas(contas) {
    return contas.map(conta => ({
        pacienteId: conta.pacienteId || '', pacienteNome: conta.pacienteNome || conta.descricao || conta.categoria || 'Conta a pagar', dataISO: conta.data,
        dataObj: criarDataLocal(conta.data), hora: '--:--', modalidade: conta.categoria || 'Manual', valor: Number(conta.valor || 0),
        status: 'Conta a pagar', pago: Boolean(conta.pago), tipoConta: 'pagar', contaId: conta.contaId || conta.id,
        recorrente: Boolean(conta.recorrente), chavePagamento: conta.chavePagamento || ''
    }));
}

function atualizarCardsFinanceiros(totais, pagar, ids = {}) {
    const saldo = totais.previsto - pagar;
    if (document.getElementById(ids.previsto || 'previsaoMesAtual')) document.getElementById(ids.previsto || 'previsaoMesAtual').innerText = formatarMoeda(totais.previsto);
    if (document.getElementById(ids.recebido || 'recebidosMesAtual')) document.getElementById(ids.recebido || 'recebidosMesAtual').innerText = formatarMoeda(totais.recebido);
    if (document.getElementById(ids.aberto || 'aReceberMesAtual')) document.getElementById(ids.aberto || 'aReceberMesAtual').innerText = formatarMoeda(totais.aReceber);
    if (document.getElementById(ids.pagar || 'contasPagarMesAtual')) document.getElementById(ids.pagar || 'contasPagarMesAtual').innerText = formatarMoeda(pagar);
    if (document.getElementById(ids.saldo || 'saldoMesAtual')) document.getElementById(ids.saldo || 'saldoMesAtual').innerText = formatarMoeda(saldo);
}

async function atualizarIndicadoresFinanceirosDashboard() {
    try {
        const base = await buscarBaseFinanceira();
        if (!base) return;
        const periodo = obterPeriodoMesAtual();
        const ocorrencias = montarOcorrenciasFinanceiras(base, periodo.inicio, periodo.fim).concat(transformarContasReceberEmLinhas(contasNoPeriodo('receber', periodo.inicio, periodo.fim)));
        const totais = calcularTotaisFinanceiros(ocorrencias);
        const pagar = totalizarContas(contasNoPeriodo('pagar', periodo.inicio, periodo.fim), true);
        atualizarCardsFinanceiros(totais, pagar);
    } catch (err) {
        console.error(err);
    }
}

async function carregarTelaRelatorios() {
    const inicioInput = document.getElementById('dataInicioRelatorio');
    const fimInput = document.getElementById('dataFimRelatorio');
    const selectPaciente = document.getElementById('filtroPacienteRelatorio');
    if (!inicioInput || !fimInput || !selectPaciente) return;

    const periodo = obterPeriodoMesAtual();
    if (!inicioInput.value) inicioInput.value = formatarDataISO(periodo.inicio);
    if (!fimInput.value) fimInput.value = formatarDataISO(periodo.fim);

    try {
        const { data: pacientes } = await bancoDados.from('pacientes').select('id, nome, status').order('nome');
        const selecionado = selectPaciente.value;
        let htmlOptions = '<option value="">Todos os pacientes</option>';
        (pacientes || []).forEach(p => {
            const sufixo = p.status === 'Inativo' ? ' (Inativo)' : '';
            htmlOptions += `<option value="${p.id}">${escaparHTML((p.nome || 'Paciente sem nome') + sufixo)}</option>`;
        });
        selectPaciente.innerHTML = htmlOptions;
        selectPaciente.value = selecionado;
        gerarRelatorioFinanceiro();
    } catch (err) {
        console.error(err);
    }
}

async function gerarRelatorioFinanceiro() {
    const inicioInput = document.getElementById('dataInicioRelatorio');
    const fimInput = document.getElementById('dataFimRelatorio');
    const selectPaciente = document.getElementById('filtroPacienteRelatorio');
    const filtroPagamento = document.getElementById('filtroPagamentoRelatorio');
    const tipoInput = document.getElementById('tipoRelatorio');
    const resultado = document.getElementById('resultadoRelatorio');
    if (!inicioInput || !fimInput || !selectPaciente || !filtroPagamento || !tipoInput || !resultado) return;

    const dataInicio = criarDataLocal(inicioInput.value);
    const dataFim = criarDataLocal(fimInput.value);
    if (!dataInicio || !dataFim) {
        resultado.innerHTML = 'Informe um periodo valido para gerar o relatorio.';
        return;
    }

    resultado.innerHTML = 'Gerando relatorio...';

    try {
        const inicio = dataInicio <= dataFim ? dataInicio : dataFim;
        const fim = dataInicio <= dataFim ? dataFim : dataInicio;
        inicioInput.value = formatarDataISO(inicio);
        fimInput.value = formatarDataISO(fim);

        const base = await buscarBaseFinanceira();
        const contasReceber = contasNoPeriodo('receber', inicio, fim);
        const contasPagar = contasNoPeriodo('pagar', inicio, fim);
        const ocorrencias = montarOcorrenciasFinanceiras(base, inicio, fim, selectPaciente.value).concat(transformarContasReceberEmLinhas(contasReceber));
        const totais = calcularTotaisFinanceiros(ocorrencias);

        if (document.getElementById('relatorioTotalPrevisto')) document.getElementById('relatorioTotalPrevisto').innerText = formatarMoeda(totais.previsto);
        if (document.getElementById('relatorioTotalRecebido')) document.getElementById('relatorioTotalRecebido').innerText = formatarMoeda(totais.recebido);
        if (document.getElementById('relatorioTotalReceber')) document.getElementById('relatorioTotalReceber').innerText = formatarMoeda(totais.aReceber);

        let linhas = ocorrencias;
        if (tipoInput.value === 'contas_pagar') {
            linhas = transformarContasPagarEmLinhas(contasPagar);
        } else if (tipoInput.value === 'contas_manuais') {
            linhas = transformarContasReceberEmLinhas(contasReceber).concat(transformarContasPagarEmLinhas(contasPagar));
        } else if (tipoInput.value === 'contas_receber' && filtroPagamento.value === 'todos') {
            linhas = ocorrencias.filter(item => !item.pago);
        } else if (tipoInput.value === 'recebidos' && filtroPagamento.value === 'todos') {
            linhas = ocorrencias.filter(item => item.pago);
        }
        if (filtroPagamento.value === 'pago') linhas = linhas.filter(item => item.pago);
        if (filtroPagamento.value === 'aberto') linhas = linhas.filter(item => !item.pago);

        if (linhas.length === 0) {
            resultado.innerHTML = 'Nenhuma ocorrencia encontrada para os filtros selecionados.';
            return;
        }

        resultado.innerHTML = `
            <table class="tabela-relatorio">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Paciente</th>
                        <th>Hora</th>
                        <th>Modalidade</th>
                        <th>Status</th>
                        <th>Pagamento</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhas.map(item => `
                        <tr>
                            <td>${formatarDataBR(item.dataObj)}</td>
                            <td>${escaparHTML(item.pacienteNome)}</td>
                            <td>${escaparHTML(item.hora)}</td>
                            <td>${escaparHTML(item.modalidade)}</td>
                            <td>${escaparHTML(item.status)}</td>
                            <td><span class="${item.pago ? 'badge-pago' : 'badge-aberto'}">${item.pago ? 'Pago' : 'Em aberto'}</span></td>
                            <td>${formatarMoeda(item.valor)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
        resultado.innerHTML = 'Erro ao gerar relatorio financeiro.';
    }
}

async function atualizarDashboard() {
    if (!bancoDados) return;
    try {
        const { data } = await bancoDados.from('pacientes').select('status');
        let ativos = 0;
        if (data) data.forEach(p => p.status === 'Inativo' ? null : ativos++);
        if (document.getElementById('totalAtivos')) document.getElementById('totalAtivos').innerText = ativos;
        atualizarIndicadoresFinanceirosDashboard();
    } catch (err) {
        console.error(err);
    }
}

function alternarFormularioConta(tipo) {
    const form = document.getElementById(tipo === 'pagar' ? 'formContaPagar' : 'formContaReceber');
    if (!form) return;
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    const data = document.getElementById(tipo === 'pagar' ? 'contaPagarData' : 'contaReceberData');
    if (data && !data.value) data.value = formatarDataISO(new Date());
}
window.alternarFormularioConta = alternarFormularioConta;

function alternarDescricaoContaPagar() {
    const grupo = document.getElementById('grupoDescricaoContaPagar');
    const categoria = document.getElementById('contaPagarCategoria')?.value;
    if (grupo) grupo.style.display = categoria === 'Outro' ? 'block' : 'none';
}
window.alternarDescricaoContaPagar = alternarDescricaoContaPagar;

function salvarContaManual(tipo) {
    const sufixo = tipo === 'pagar' ? 'Pagar' : 'Receber';
    const data = document.getElementById(`conta${sufixo}Data`)?.value;
    const valor = Number(document.getElementById(`conta${sufixo}Valor`)?.value || 0);
    const categoria = tipo === 'pagar' ? document.getElementById('contaPagarCategoria')?.value : 'Conta a receber';
    const descricao = tipo === 'pagar' ? (categoria === 'Outro' ? document.getElementById('contaPagarDescricao')?.value : categoria) : document.getElementById('contaReceberDescricao')?.value;
    if (!data || !valor || valor <= 0 || !descricao?.trim()) { alert('Preencha data, descricao e valor da conta.'); return; }
    const contas = obterContasManuais();
    const pago = Boolean(document.getElementById(tipo === 'pagar' ? 'contaPagarPago' : 'contaReceberPago')?.checked);
    contas.push({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, tipo, data, valor, categoria, descricao: descricao.trim(), pago });
    salvarContasManuais(contas);
    document.getElementById(`conta${sufixo}Valor`).value = '';
    if (tipo === 'pagar') document.getElementById('contaPagarDescricao').value = '';
    else document.getElementById('contaReceberDescricao').value = '';
    const campoPago = document.getElementById(tipo === 'pagar' ? 'contaPagarPago' : 'contaReceberPago');
    if (campoPago) campoPago.checked = false;
    alternarFormularioConta(tipo);
    carregarTelaContas(tipo);
    atualizarIndicadoresFinanceirosDashboard();
}
window.salvarContaManual = salvarContaManual;

function excluirContaManual(id, tipo) {
    salvarContasManuais(obterContasManuais().filter(conta => conta.id !== id));
    carregarTelaContas(tipo);
    atualizarIndicadoresFinanceirosDashboard();
}
window.excluirContaManual = excluirContaManual;

function alternarContaPaga(id, tipo, paga, chavePagamento = '') {
    if (chavePagamento) {
        localStorage.setItem(chavePagamento, paga ? 'true' : 'false');
        carregarTelaContas(tipo);
        atualizarIndicadoresFinanceirosDashboard();
        return;
    }
    const contas = obterContasManuais();
    const conta = contas.find(item => item.id === id && item.tipo === tipo);
    if (!conta) return;
    conta.pago = paga;
    salvarContasManuais(contas);
    carregarTelaContas(tipo);
    atualizarIndicadoresFinanceirosDashboard();
}
window.alternarContaPaga = alternarContaPaga;

function obterPeriodoFiltrosContas(tipo) {
    const sufixo = tipo === 'pagar' ? 'Pagar' : 'Receber';
    const inicioInput = document.getElementById(`filtro${sufixo}Inicio`);
    const fimInput = document.getElementById(`filtro${sufixo}Fim`);
    const periodoPadrao = obterPeriodoMesAtual();
    if (inicioInput && !inicioInput.value) inicioInput.value = formatarDataISO(periodoPadrao.inicio);
    if (fimInput && !fimInput.value) fimInput.value = formatarDataISO(periodoPadrao.fim);
    const inicio = criarDataLocal(inicioInput?.value) || periodoPadrao.inicio;
    const fim = criarDataLocal(fimInput?.value) || periodoPadrao.fim;
    return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
}

function filtroStatusContas(tipo) {
    return document.getElementById(tipo === 'pagar' ? 'filtroPagarStatus' : 'filtroReceberStatus')?.value || 'todos';
}

async function carregarTelaContas(tipo) {
    const periodo = obterPeriodoFiltrosContas(tipo);
    const contasTipo = contasNoPeriodo(tipo, periodo.inicio, periodo.fim);
    const lista = document.getElementById(tipo === 'pagar' ? 'listaContasPagar' : 'listaContasReceber');
    if (!lista) return;
    let totais = { previsto: 0, recebido: 0, aReceber: 0 };
    let pagar = totalizarContas(contasNoPeriodo('pagar', periodo.inicio, periodo.fim), true);
    let linhas = [];
    if (bancoDados) {
        const base = await buscarBaseFinanceira();
        const ocorrencias = montarOcorrenciasFinanceiras(base, periodo.inicio, periodo.fim).concat(transformarContasReceberEmLinhas(contasNoPeriodo('receber', periodo.inicio, periodo.fim)));
        totais = calcularTotaisFinanceiros(ocorrencias);
        linhas = tipo === 'receber' ? ocorrencias : transformarContasPagarEmLinhas(contasTipo);
    } else {
        linhas = tipo === 'receber' ? transformarContasReceberEmLinhas(contasTipo) : transformarContasPagarEmLinhas(contasTipo);
    }
    atualizarCardsFinanceiros(totais, pagar, tipo === 'pagar' ? { pagar: 'pagarTotal', saldo: 'pagarSaldo' } : { previsto: 'receberPrevisto', recebido: 'receberRecebido', aberto: 'receberAberto', pagar: 'receberPagar', saldo: 'receberSaldo' });
    const filtro = filtroStatusContas(tipo);
    if (filtro === 'pago') linhas = linhas.filter(linha => linha.pago);
    if (filtro === 'aberto') linhas = linhas.filter(linha => !linha.pago);
    if (linhas.length === 0) { lista.innerHTML = 'Nenhuma conta encontrada para os filtros selecionados.'; return; }
    lista.innerHTML = `<table class="tabela-relatorio"><thead><tr><th>Data</th><th>${tipo === 'pagar' ? 'Paciente / Descricao' : 'Paciente / Descricao'}</th><th>Categoria</th><th>Pagamento</th><th>Valor</th><th></th></tr></thead><tbody>${linhas.map(linha => {
        const contaManual = linha.contaId ? obterContasManuais().find(conta => conta.id === linha.contaId) : null;
        const pagamento = contaManual ? `<label class="checkbox-pagamento checkbox-tabela"><input type="checkbox" ${linha.pago ? 'checked' : ''} onchange="alternarContaPaga('${linha.contaId}', '${tipo}', this.checked, '${linha.chavePagamento || ''}')"><span>Pago</span></label>` : `<span class="${linha.pago ? 'badge-pago' : 'badge-aberto'}">${linha.pago ? 'Pago' : 'Em aberto'}</span>`;
        return `<tr><td>${formatarDataBR(linha.dataObj)}</td><td>${escaparHTML(linha.pacienteNome)}</td><td>${escaparHTML(linha.modalidade || '')}</td><td>${pagamento}</td><td>${formatarMoeda(linha.valor)}</td><td>${contaManual && !linha.recorrente ? `<button class="btn-perigo btn-conta-excluir" onclick="excluirContaManual('${linha.contaId}', '${tipo}')">Excluir</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function alternarDescricaoContaPagarOcorrencia() {
    const categoria = document.getElementById('contaPagarOcorrenciaCategoria')?.value || '';
    const descricao = document.getElementById('contaPagarOcorrenciaDescricao');
    const valor = document.getElementById('contaPagarOcorrenciaValor');
    const pago = document.getElementById('contaPagarOcorrenciaPagoBox');
    if (descricao) descricao.style.display = categoria === 'Outro' ? 'block' : 'none';
    if (valor) valor.style.display = categoria ? 'block' : 'none';
    if (pago) pago.style.display = categoria ? 'inline-flex' : 'none';
}
window.alternarDescricaoContaPagarOcorrencia = alternarDescricaoContaPagarOcorrencia;

function chaveOrigemContaPagar(pacienteId, dataISO) { return `ocorrencia_${pacienteId}_${dataISO}`; }

function carregarContaPagarOcorrencia(pacienteId, dataISO) {
    const data = criarDataLocal(dataISO);
    const conta = contasNoPeriodo('pagar', data, data)
        .find(item => String(item.pacienteId) === String(pacienteId))
        || obterContasManuais().find(item => item.tipo === 'pagar' && item.origem === chaveOrigemContaPagar(pacienteId, dataISO));
    const categoria = document.getElementById('contaPagarOcorrenciaCategoria');
    const descricao = document.getElementById('contaPagarOcorrenciaDescricao');
    const valor = document.getElementById('contaPagarOcorrenciaValor');
    const pago = document.getElementById('contaPagarOcorrenciaPago');
    if (categoria) categoria.value = conta?.categoria || '';
    if (descricao) descricao.value = conta?.categoria === 'Outro' ? (conta.descricao || '') : '';
    if (valor) valor.value = conta?.valor || '';
    if (pago) pago.checked = Boolean(conta?.pago);
    alternarDescricaoContaPagarOcorrencia();
}

function validarContaPagarOcorrencia() {
    const categoria = document.getElementById('contaPagarOcorrenciaCategoria')?.value || '';
    const valor = Number(document.getElementById('contaPagarOcorrenciaValor')?.value || 0);
    const descricao = document.getElementById('contaPagarOcorrenciaDescricao')?.value || '';
    if (!categoria) return true;
    if (!valor || valor <= 0 || (categoria === 'Outro' && !descricao.trim())) { alert('Informe o valor e, para a categoria Outro, a descricao da conta a pagar.'); return false; }
    return true;
}

async function salvarContaPagarOcorrencia(pacienteId, dataOriginal, novaData, escopo, frequencia) {
    const categoria = document.getElementById('contaPagarOcorrenciaCategoria')?.value || '';
    const valor = Number(document.getElementById('contaPagarOcorrenciaValor')?.value || 0);
    const descricaoOutro = document.getElementById('contaPagarOcorrenciaDescricao')?.value || '';
    const pago = Boolean(document.getElementById('contaPagarOcorrenciaPago')?.checked);
    const origemOriginal = chaveOrigemContaPagar(pacienteId, dataOriginal);
    const origemNova = chaveOrigemContaPagar(pacienteId, novaData);
    let contas = obterContasManuais();
    const recorrente = escopo === 'demais';
    const origem = recorrente ? `recorrencia_pagar_${pacienteId}_${novaData}` : origemNova;
    const indice = contas.findIndex(item => item.tipo === 'pagar' && item.origem === origem);
    let pacienteNome = 'Paciente';
    if (bancoDados) {
        const resposta = await bancoDados.from('pacientes').select('nome').eq('id', pacienteId);
        pacienteNome = resposta.data?.[0]?.nome || pacienteNome;
    }
    const dataObj = criarDataLocal(novaData);
    const diasTexto = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
    const conta = { id: indice >= 0 ? contas[indice].id : `${Date.now()}_${Math.random().toString(16).slice(2)}`, tipo: 'pagar', origem, pacienteId, pacienteNome, data: novaData, valor, categoria, descricao: categoria === 'Outro' ? descricaoOutro.trim() : categoria, pago: recorrente ? false : pago, recorrente, ativo: Boolean(categoria), frequencia, diaSemana: diasTexto[dataObj.getDay()] };
    if (indice >= 0) contas[indice] = conta; else contas.push(conta);
    if (recorrente) localStorage.setItem(`pagamento_conta_${conta.id}_${novaData}`, pago ? 'true' : 'false');
    salvarContasManuais(contas);
}

function gerarPdfRelatorio() {
    const resultado = document.getElementById('resultadoRelatorio');
    const inicio = document.getElementById('dataInicioRelatorio')?.value;
    const fim = document.getElementById('dataFimRelatorio')?.value;
    const paciente = document.getElementById('filtroPacienteRelatorio')?.selectedOptions[0]?.text || 'Todos os pacientes';
    const tipo = document.getElementById('tipoRelatorio')?.selectedOptions[0]?.text || 'Resumo Completo';

    if (!resultado || !resultado.querySelector('table')) {
        alert('Gere o relatorio antes de criar o PDF.');
        return;
    }

    const janela = window.open('', '_blank', 'width=1100,height=800');
    if (!janela) {
        alert('O navegador bloqueou a nova janela. Permita pop-ups para gerar o PDF.');
        return;
    }

    const tabela = resultado.querySelector('table');
    const total = Array.from(tabela.querySelectorAll('tbody tr')).reduce((soma, linha) => {
        const textoValor = linha.cells[6]?.innerText || '0';
        return soma + Number(textoValor.replace(/[^0-9,]/g, '').replace(',', '.'));
    }, 0);
    const inicioBR = inicio ? formatarDataBR(criarDataLocal(inicio)) : '--';
    const fimBR = fim ? formatarDataBR(criarDataLocal(fim)) : '--';
    const logoRelatorio = 'data:image/png;base64,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';
    janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title></title><style>
        @page { margin: 12mm; } body { font-family: Arial, sans-serif; color: #172033; margin: 28px; } .cabecalho { position: relative; min-height: 75px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; } .logo { position: absolute; left: 0; width: 195px; height: auto; object-fit: contain; } h1 { margin: 0; padding: 0 205px; font-size: 24px; text-align: center; } .filtros { color: #4b5563; margin-bottom: 20px; line-height: 1.6; } table { width: 100%; border-collapse: collapse; font-size: 12px; } th, td { padding: 8px; text-align: left; border-bottom: 1px solid #cbd5e1; } th { background: #eaf0f8; } .total-final { margin-top: 12px; text-align: right; font-size: 15px; font-weight: 700; } @media print { body { margin: 0; } }
    </style></head><body><div class="cabecalho"><img class="logo" src="${logoRelatorio}" alt="Logo"><h1>Demonstrativo Financeiro de Atendimentos</h1></div><div class="filtros"><b>Paciente:</b> ${escaparHTML(paciente)}<br><b>Periodo:</b> ${escaparHTML(inicioBR)} a ${escaparHTML(fimBR)}</div>${resultado.innerHTML}<div class="total-final">Total: ${formatarMoeda(total)}</div><script>window.onload = () => window.print();<\/script></body></html>`);
    janela.document.close();
}

async function carregarPacientes() {
    if (!bancoDados) return;
    const lista = document.getElementById('listaPacientes');
    if (!lista) return;
    lista.innerHTML = '<div>Buscando listagem...</div>';
    try {
        const { data } = await bancoDados.from('pacientes').select('*').order('nome');
        if (!data || data.length === 0) {
            lista.innerHTML = '<div>Nenhum paciente localizado.</div>';
            return;
        }
        let html = '';
        data.forEach(paciente => {
            html += `
                <div class="cardPaciente" style="${paciente.status === 'Inativo' ? 'opacity:0.65;' : ''}">
                    <strong>${paciente.nome || ''}</strong><br>
                    <small>WhatsApp: ${paciente.telefone || 'Nao informado'}</small><br>
                    <button class="btn-editar" style="margin-top:10px;" onclick="prepararEdicaoPaciente('${paciente.id}')">Ver Perfil / Calendario</button>
                </div>
            `;
        });
        lista.innerHTML = html;
    } catch (err) {
        console.error(err);
    }
}

window.prepararEdicaoPaciente = async function(id) {
    idPacienteEditando = id;
    try {
        const { data } = await bancoDados.from('pacientes').select('*').eq('id', id);
        const p = data[0];
        mostrarTela('novoPaciente');
        if (document.getElementById('nome')) document.getElementById('nome').value = p.nome || '';
        if (document.getElementById('cpf')) document.getElementById('cpf').value = p.cpf || '';
        if (document.getElementById('telefone')) document.getElementById('telefone').value = p.telefone || '';
        if (document.getElementById('email')) document.getElementById('email').value = p.email || '';
        if (document.getElementById('dataNascimento')) document.getElementById('dataNascimento').value = p.data_nascimento || '';
        if (document.getElementById('endereco')) document.getElementById('endereco').value = p.endereco || '';
        if (document.getElementById('responsavel')) document.getElementById('responsavel').value = p.responsavel || '';
        if (document.getElementById('observacoes')) document.getElementById('observacoes').value = p.observacoes || '';
        if (document.getElementById('statusVinculo')) document.getElementById('statusVinculo').value = p.status || 'Ativo';

        const planoRes = await bancoDados.from('planos_atendimento').select('*').eq('paciente_id', id);
        if (planoRes.data && planoRes.data.length > 0) {
            const pl = planoRes.data[0];
            if (document.getElementById('dataInicial')) document.getElementById('dataInicial').value = pl.data_inicio || '';
            if (document.getElementById('diaSemana')) document.getElementById('diaSemana').value = pl.dia_semana || 'Segunda';
            if (document.getElementById('frequencia')) document.getElementById('frequencia').value = pl.frequencia || 'Semanal';
            if (document.getElementById('horario')) document.getElementById('horario').value = pl.hora_padrao || '';
            if (document.getElementById('modalidade')) document.getElementById('modalidade').value = pl.modalidade || 'Presencial';
            if (document.getElementById('valor')) document.getElementById('valor').value = pl.valor || '';
            if (document.getElementById('formaCobranca')) document.getElementById('formaCobranca').value = pl.forma_cobranca || 'Mensal';
        }
        configurarPeriodoPadraoSidebar();
        renderizarSidebarCalendarioPaciente(id);
    } catch (err) {
        console.error(err);
        alert('Erro ao carregar prontuario.');
    }
};

async function salvarPaciente() {
    if (!bancoDados) return;
    const nome = document.getElementById('nome')?.value;
    if (!nome) {
        alert('O nome e obrigatorio.');
        return;
    }
    const payloadPaciente = {
        nome: nome,
        cpf: document.getElementById('cpf')?.value || '',
        telefone: document.getElementById('telefone')?.value || '',
        email: document.getElementById('email')?.value || '',
        data_nascimento: document.getElementById('dataNascimento')?.value || null,
        endereco: document.getElementById('endereco')?.value || '',
        responsavel: document.getElementById('responsavel')?.value || '',
        observacoes: document.getElementById('observacoes')?.value || '',
        status: document.getElementById('statusVinculo')?.value || 'Ativo'
    };

    try {
        let pacienteId = idPacienteEditando;
        if (idPacienteEditando) {
            await bancoDados.from('pacientes').update(payloadPaciente).eq('id', idPacienteEditando);
        } else {
            const { data } = await bancoDados.from('pacientes').insert([payloadPaciente]).select();
            pacienteId = data[0].id;
            idPacienteEditando = pacienteId;
        }

        const payloadPlano = {
            paciente_id: pacienteId,
            data_inicio: document.getElementById('dataInicial')?.value || null,
            dia_semana: document.getElementById('diaSemana')?.value || 'Segunda',
            frequencia: document.getElementById('frequencia')?.value || 'Semanal',
            hora_padrao: document.getElementById('horario')?.value || '',
            modalidade: document.getElementById('modalidade')?.value || 'Presencial',
            valor: Number(document.getElementById('valor')?.value || 0),
            forma_cobranca: document.getElementById('formaCobranca')?.value || 'Mensal',
            ativo: true
        };

        const { data: planoExistente } = await bancoDados.from('planos_atendimento').select('id').eq('paciente_id', pacienteId);
        if (planoExistente && planoExistente.length > 0) {
            await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', pacienteId);
        } else {
            await bancoDados.from('planos_atendimento').insert([payloadPlano]);
        }
        alert('Prontuario salvo com sucesso!');
        mostrarTela('pacientes');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar.');
    }
}

window.excluirPacienteAtual = async function() {
    if (!idPacienteEditando || !confirm("Remover permanentemente este registro?")) return;
    try {
        await bancoDados.from('planos_atendimento').delete().eq('paciente_id', idPacienteEditando);
        await bancoDados.from('agendamentos').delete().eq('paciente_id', idPacienteEditando);
        await bancoDados.from('pacientes').delete().eq('id', idPacienteEditando);
        idPacienteEditando = null;
        mostrarTela('pacientes');
    } catch (err) {
        console.error(err);
    }
};

function carregarConfiguracoesCampos() {
    if (document.getElementById('cfgTituloClinica')) document.getElementById('cfgTituloClinica').value = localStorage.getItem('cfg_titulo_clinica') || 'Clinica Integrada';
    if (document.getElementById('cfgSubtituloClinica')) document.getElementById('cfgSubtituloClinica').value = localStorage.getItem('cfg_subtitulo_clinica') || 'Gestao de Saude';
    if (document.getElementById('cfgTemaSistema')) document.getElementById('cfgTemaSistema').value = localStorage.getItem('cfg_tema_sistema') || 'claro';
    if (document.getElementById('cfgCorSidebar')) document.getElementById('cfgCorSidebar').value = localStorage.getItem('cfg_cor_sidebar') || '#1e293b';
    if (document.getElementById('cfgCorPrincipal')) document.getElementById('cfgCorPrincipal').value = localStorage.getItem('cfg_cor_principal') || '#2563eb';

    const urlLogoSalva = localStorage.getItem('cfg_logo_url') || '';
    if (document.getElementById('cfgLogoUrl')) {
        document.getElementById('cfgLogoUrl').value = urlLogoSalva.startsWith('data:image') ? '(Arquivo local anexado)' : urlLogoSalva;
    }
}

function aplicarConfiguracoesVisuais() {
    const titulo = localStorage.getItem('cfg_titulo_clinica') || 'Clinica Integrada';
    const subtitulo = localStorage.getItem('cfg_subtitulo_clinica') || 'Gestao de Saude';
    const logoUrl = localStorage.getItem('cfg_logo_url') || '';
    const tema = localStorage.getItem('cfg_tema_sistema') || 'claro';
    const corSidebar = localStorage.getItem('cfg_cor_sidebar') || '#1e293b';
    const corPrincipal = localStorage.getItem('cfg_cor_principal') || '#2563eb';

    if (document.getElementById('nomeClinicaTexto')) document.getElementById('nomeClinicaTexto').innerText = titulo;
    if (document.getElementById('subtituloClinicaTexto')) document.getElementById('subtituloClinicaTexto').innerText = subtitulo;

    const imgLogo = document.getElementById('logoClinicaDisplay');
    if (imgLogo) {
        if (logoUrl) {
            imgLogo.src = logoUrl;
            imgLogo.style.display = 'block';
        } else {
            imgLogo.style.display = 'none';
        }
    }

    if (tema === 'escuro') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    document.documentElement.style.setProperty('--sidebar-bg', corSidebar);
    document.documentElement.style.setProperty('--primary-color', corPrincipal);
}

function salvarConfiguracoes() {
    const titulo = document.getElementById('cfgTituloClinica')?.value || 'Clinica Integrada';
    const subtitulo = document.getElementById('cfgSubtituloClinica')?.value || 'Gestao de Saude';
    const tema = document.getElementById('cfgTemaSistema')?.value || 'claro';
    const corSidebar = document.getElementById('cfgCorSidebar')?.value || '#1e293b';
    const corPrincipal = document.getElementById('cfgCorPrincipal')?.value || '#2563eb';

    localStorage.setItem('cfg_titulo_clinica', titulo);
    localStorage.setItem('cfg_subtitulo_clinica', subtitulo);
    localStorage.setItem('cfg_tema_sistema', tema);
    localStorage.setItem('cfg_cor_sidebar', corSidebar);
    localStorage.setItem('cfg_cor_principal', corPrincipal);

    if (uploadLogoBase64) {
        localStorage.setItem('cfg_logo_url', uploadLogoBase64);
        uploadLogoBase64 = "";
    } else {
        const urlInput = document.getElementById('cfgLogoUrl')?.value || '';
        if (urlInput && urlInput !== '(Arquivo local anexado)') {
            localStorage.setItem('cfg_logo_url', urlInput);
        }
    }
    aplicarConfiguracoesVisuais();
    alert('Configuracoes salvas com sucesso!');
}


