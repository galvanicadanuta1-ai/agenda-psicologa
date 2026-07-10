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

const MAPA_CLASSES_STATUS = {
    'Realizado': 'status-realizado',
    'Falta': 'status-falta',
    'Agendado': 'status-agendado',
    'Cancelado': 'status-cancelado'
};

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

function alternarSubmenuPacientes() {
    const sub = document.getElementById('submenuPacientes');
    if (sub) sub.style.display = (sub.style.display === 'flex') ? 'none' : 'flex';
}
window.alternarSubmenuPacientes = alternarSubmenuPacientes;

function acionarMenuNovoPaciente() {
    idPacienteEditando = null;
    mostrarTela('novoPaciente');
}
window.acionarMenuNovoPaciente = acionarMenuNovoPaciente;

function mostrarTela(nomeTela) {
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

window.addEventListener('load', () => {
    aplicarConfiguracoesVisuais();
    mostrarTela('dashboard');
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnSalvarPaciente')?.addEventListener('click', salvarPaciente);
    document.getElementById('btnSalvarConfiguracoes')?.addEventListener('click', salvarConfiguracoes);
    document.getElementById('btnAplicarPeriodoPaciente')?.addEventListener('click', () => renderizarSidebarCalendarioPaciente(idPacienteEditando, true));

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
                    <div class="grade-agenda">
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

    document.getElementById('btnPersistirAgendamento').onclick = async function() {
        const escopo = document.getElementById('escopoModificacaoAgenda').value;
        const novaData = document.getElementById('dataAgendamento').value;
        const novaHora = document.getElementById('horaAgendamento').value;
        const novaMod = document.getElementById('modalidadeAgendamento').value;
        const novoVal = Number(document.getElementById('valorAgendamento').value || 0);
        const novoStat = document.getElementById('statusAgendamento').value;

        await executarSalvamentoPorEscopo(pacienteId, dataISO, novaData, novaHora, novaMod, novoVal, novoStat, escopo, null);
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

                htmlProxe += `
                    <div class="container-linha-bloco ${classeStatusSide}">
                        <div class="linha-data">${exibData} as ${exibHora} - ${exibMod}</div>
                        <div class="linha-status">Status: <b>${exibStatus}</b> | R$ ${Number(exibValor).toFixed(2)}</div>
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

async function atualizarDashboard() {
    if (!bancoDados) return;
    try {
        const { data } = await bancoDados.from('pacientes').select('status');
        let ativos = 0;
        let inativos = 0;
        if (data) data.forEach(p => p.status === 'Inativo' ? inativos++ : ativos++);
        if (document.getElementById('totalAtivos')) document.getElementById('totalAtivos').innerText = ativos;
        if (document.getElementById('totalInativos')) document.getElementById('totalInativos').innerText = inativos;
    } catch (err) {
        console.error(err);
    }
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

const MAPA_CLASSES_STATUS = {
    'Realizado': 'status-realizado',
    'Falta': 'status-falta',
    'Agendado': 'status-agendado',
    'Cancelado': 'status-cancelado'
};

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

function alternarSubmenuPacientes() {
    const sub = document.getElementById('submenuPacientes');
    if (sub) sub.style.display = (sub.style.display === 'flex') ? 'none' : 'flex';
}
window.alternarSubmenuPacientes = alternarSubmenuPacientes;

function acionarMenuNovoPaciente() {
    idPacienteEditando = null;
    mostrarTela('novoPaciente');
}
window.acionarMenuNovoPaciente = acionarMenuNovoPaciente;

function mostrarTela(nomeTela) {
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

window.addEventListener('load', () => {
    aplicarConfiguracoesVisuais();
    mostrarTela('dashboard');
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnSalvarPaciente')?.addEventListener('click', salvarPaciente);
    document.getElementById('btnSalvarConfiguracoes')?.addEventListener('click', salvarConfiguracoes);
    document.getElementById('btnAplicarPeriodoPaciente')?.addEventListener('click', () => renderizarSidebarCalendarioPaciente(idPacienteEditando, true));

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
                    <div class="grade-agenda">
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

    document.getElementById('btnPersistirAgendamento').onclick = async function() {
        const escopo = document.getElementById('escopoModificacaoAgenda').value;
        const novaData = document.getElementById('dataAgendamento').value;
        const novaHora = document.getElementById('horaAgendamento').value;
        const novaMod = document.getElementById('modalidadeAgendamento').value;
        const novoVal = Number(document.getElementById('valorAgendamento').value || 0);
        const novoStat = document.getElementById('statusAgendamento').value;

        await executarSalvamentoPorEscopo(pacienteId, dataISO, novaData, novaHora, novaMod, novoVal, novoStat, escopo, null);
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

                htmlProxe += `
                    <div class="container-linha-bloco ${classeStatusSide}">
                        <div class="linha-data">${exibData} as ${exibHora} - ${exibMod}</div>
                        <div class="linha-status">Status: <b>${exibStatus}</b> | R$ ${Number(exibValor).toFixed(2)}</div>
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

async function atualizarDashboard() {
    if (!bancoDados) return;
    try {
        const { data } = await bancoDados.from('pacientes').select('status');
        let ativos = 0;
        let inativos = 0;
        if (data) data.forEach(p => p.status === 'Inativo' ? inativos++ : ativos++);
        if (document.getElementById('totalAtivos')) document.getElementById('totalAtivos').innerText = ativos;
        if (document.getElementById('totalInativos')) document.getElementById('totalInativos').innerText = inativos;
    } catch (err) {
        console.error(err);
    }
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
