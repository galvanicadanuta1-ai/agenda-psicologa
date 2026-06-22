// ==========================================================================
// CONFIGURAÇÕES DE CONEXÃO DO SUPABASE
// ==========================================================================
const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2JrY2xvZnNucm9wc3NyYWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODg3NjcsImV4cCI6MjA5Njc2NDc2N30._8_tmYoRlyEhARjXZ3swW8ynCPY5aysGMFCTzgcnK5Y';

let bancoDados;
if (window.supabase) {
    bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro crítico: Biblioteca Supabase inacessível.");
}

let idPacienteEditando = null;

// ==========================================================================
// NAVEGAÇÃO INTERNA SPA - TÍTULOS LIMPOS NAS SEÇÕES
// ==========================================================================
function mostrarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach(tela => tela.style.display = 'none');
    
    const telaAlvo = document.getElementById(nomeTela);
    if (telaAlvo) telaAlvo.style.display = 'block';

    const sidePerfil = document.getElementById('sidebar-agenda-paciente');
    if (sidePerfil) sidePerfil.style.display = 'none';

    const titulosModulos = {
        'dashboard': '📊 Painel de Indicadores',
        'agenda': '📅 Grade de Compromissos Semanais',
        'pacientes': '👥 Listagem de Pacientes Cadastrados',
        'novoPaciente': idPacienteEditando ? '📝 Perfil e Histórico Clínico' : '➕ Cadastro de Novo Paciente',
        'configuracoes': '⚙️ Parâmetros do Sistema'
    };
    
    const elTituloSeção = document.getElementById('tituloSeção');
    if (elTituloSeção) elTituloSeção.innerText = titulosModulos[nomeTela] || 'Painel';

    switch (nomeTela) {
        case 'dashboard':
            atualizarDashboard();
            break;
        case 'agenda':
            carregarAgendaSemanal();
            break;
        case 'pacientes':
            carregarPacientes();
            break;
        case 'novoPaciente':
            if (!idPacienteEditando) {
                document.getElementById('formPaciente')?.reset();
                const elDia = document.getElementById('diaSemana');
                if (elDia) elDia.value = 'Segunda';
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
    
    // Listeners para capturar e atualizar instantaneamente o preview lateral de 90 dias
    document.getElementById('dataInicial')?.addEventListener('change', () => {
        atualizarDiaSemanaAutomatico();
        renderizarSidebarCalendarioPaciente(idPacienteEditando);
    });

    ['frequencia', 'horario', 'modalidade', 'valor'].forEach(campoId => {
        document.getElementById(campoId)?.addEventListener('change', () => {
            renderizarSidebarCalendarioPaciente(idPacienteEditando);
        });
    });
});

// GERA O DIA DA SEMANA SEM PERMITIR ALTERAÇÃO MANUAL
function atualizarDiaSemanaAutomatico() {
    const inputData = document.getElementById('dataInicial');
    if (!inputData || !inputData.value) return;
    
    const partes = inputData.value.split('-');
    const dataObjeto = new Date(partes[0], partes[1] - 1, partes[2]);
    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    const selectDia = document.getElementById('diaSemana');
    if (selectDia) {
        selectDia.removeAttribute('disabled');
        selectDia.value = diasDaSemana[dataObjeto.getDay()];
        selectDia.setAttribute('disabled', 'true');
    }
}

// ==========================================================================
// REGRA MATEMÁTICA CORRIGIDA: RECORRÊNCIA E SEQUÊNCIAS EM DIAS DA SEMANA
// ==========================================================================
function checarDataCorrespondeAoPlano(dataAlvoObj, dataInicioStr, diaSemanaPlan, frequenciaPlan) {
    if (!dataInicioStr) return false;
    const partes = dataInicioStr.split('-');
    const dataInicioObj = new Date(partes[0], partes[1] - 1, partes[2]);
    
    dataAlvoObj.setHours(0,0,0,0);
    dataInicioObj.setHours(0,0,0,0);

    if (dataAlvoObj < dataInicioObj) return false;

    const diferencaTime = dataAlvoObj.getTime() - dataInicioObj.getTime();
    const diferencaDias = Math.round(diferencaTime / (1000 * 60 * 60 * 24));

    if (diferencaDias % 7 !== 0) return false;

    const diferencaSemanas = diferencaDias / 7;

    if (frequenciaPlan === 'Semanal') return true;
    if (frequenciaPlan === 'Quinzenal') return diferencaSemanas % 2 === 0;
    if (frequenciaPlan === 'Mensal') return diferencaSemanas % 4 === 0;

    return false;
}

// ==========================================================================
// RENDERIZAÇÃO DA AGENDA SEMANAL COM SUPORTE A 3 PONTOS EM CADA CARD
// ==========================================================================
async function carregarAgendaSemanal() {
    const containerGeral = document.getElementById('grade-agenda-container');
    if (!containerGeral) return;
    containerGeral.innerHTML = '<div style="padding: 10px;">Carregando compromissos e recorrências automáticas...</div>';

    const hoje = new Date();
    const diaSemanaAtual = hoje.getDay(); 
    const diffSegunda = diaSemanaAtual === 0 ? -6 : 1 - diaSemanaAtual;
    
    const segundaCorrente = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    segundaCorrente.setDate(segundaCorrente.getDate() + diffSegunda);

    let htmlSemanas = '';
    const nomesDiasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const formatarDataSimples = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (let s = 0; s < 5; s++) {
        const dataInicioBloco = new Date(segundaCorrente);
        dataInicioBloco.setDate(segundaCorrente.getDate() + (s * 7));

        const dataFimBloco = new Date(dataInicioBloco);
        dataFimBloco.setDate(dataInicioBloco.getDate() + 6); 

        htmlSemanas += `
            <div class="semana-bloco">
                <div class="semana-titulo">📅 Semana: de ${formatarDataSimples(dataInicioBloco)} a ${formatarDataSimples(dataFimBloco)}</div>
                <div class="grade-agenda">
        `;

        for (let d = 0; d < 7; d++) {
            const dataDiaCell = new Date(dataInicioBloco);
            dataDiaCell.setDate(dataInicioBloco.getDate() + d);

            const dataISOChave = `${dataDiaCell.getFullYear()}-${String(dataDiaCell.getMonth() + 1).padStart(2, '0')}-${String(dataDiaCell.getDate()).padStart(2, '0')}`;
            htmlSemanas += `
                <div class="coluna-dia">
                    <h3>${nomesDiasSemana[d]}. ${String(dataDiaCell.getDate()).padStart(2, '0')}/${String(dataDiaCell.getMonth() + 1).padStart(2, '0')}</h3>
                    <div class="slots-agendamentos" data-data-chave="${dataISOChave}"></div>
                </div>
            `;
        }
        htmlSemanas += `</div></div>`;
    }
    containerGeral.innerHTML = htmlSemanas;

    if (!bancoDados) return;

    try {
        const { data: pacientes } = await bancoDados.from('pacientes').select('id, nome').eq('status', 'Ativo');
        const { data: planos } = await bancoDados.from('planos_atendimento').select('*').eq('ativo', true);
        const { data: agendamentos } = await bancoDados.from('agendamentos').select('*');

        const mapaPacientes = {};
        if (pacientes) pacientes.forEach(p => mapaPacientes[p.id] = p.nome);

        document.querySelectorAll('.slots-agendamentos').forEach(container => {
            const dataChaveStr = container.getAttribute('data-data-chave');
            const partes = dataChaveStr.split('-');
            const dataObjetoCelula = new Date(partes[0], partes[1] - 1, partes[2]);

            let itensRender = [];

            const especificosHoje = agendamentos ? agendamentos.filter(a => a.data === dataChaveStr) : [];
            especificosHoje.forEach(esp => {
                if(mapaPacientes[esp.paciente_id]) {
                    const planoOrigem = planos ? planos.find(pl => pl.paciente_id === esp.paciente_id) : null;
                    itensRender.push({
                        id: esp.id,
                        pacienteId: esp.paciente_id,
                        nome: mapaPacientes[esp.paciente_id],
                        hora: esp.hora.substring(0, 5),
                        modalidade: esp.modalidade || (planoOrigem ? planoOrigem.modalidade : 'Presencial'),
                        valor: esp.valor_cobrado || (planoOrigem ? planoOrigem.valor : 0),
                        status: esp.status || 'Agendado',
                        origem: 'excecao'
                    });
                }
            });

            if (planos) {
                planos.forEach(plano => {
                    const possuiExcecaoHoje = especificosHoje.some(e => e.paciente_id === plano.paciente_id);
                    
                    if (!possuiExcecaoHoje && mapaPacientes[plano.paciente_id]) {
                        const corresponde = checarDataCorrespondeAoPlano(new Date(dataObjetoCelula), plano.data_inicio, plano.dia_semana, plano.frequencia);
                        if (corresponde) {
                            itensRender.push({
                                id: null,
                                pacienteId: plano.paciente_id,
                                nome: mapaPacientes[plano.paciente_id],
                                hora: plano.hora_padrao ? plano.hora_padrao.substring(0, 5) : '--:--',
                                modalidade: plano.modalidade || 'Presencial',
                                valor: plano.valor || 0,
                                status: 'Agendado',
                                origem: 'recorrente'
                            });
                        }
                    }
                });
            }

            itensRender.forEach(item => {
                container.innerHTML += `
                    <div class="card-compromisso" style="${item.origem === 'excecao' ? 'border-left-color: #3182ce;' : ''}">
                        <div class="card-paciente-nome">${item.nome}</div>
                        <div class="card-paciente-hora">⏱️ ${item.hora}</div>
                        <div class="card-paciente-modalidade">${item.modalidade} - R$ ${Number(item.valor).toFixed(2)}</div>
                        <button class="btn-tres-pontos-agenda" onclick="abrirEditorDiretoAgenda('${item.pacienteId}', '${dataChaveStr}', '${item.hora}', '${item.modalidade}', '${item.valor}', '${item.status}')">...</button>
                    </div>
                `;
            });
        });

    } catch (err) { console.error("Erro ao processar agenda:", err); }
}

// ==========================================================================
// EDICAO ATRAVÉS DOS 3 PONTOS DA AGENDA GERAL
// ==========================================================================
window.abrirEditorDiretoAgenda = function(pacienteId, dataISO, hora, modalidade, valor, status) {
    const modal = document.getElementById('modalAgendamento');
    const titulo = document.getElementById('modalAgendamentoTitulo');
    const boxEscopo = document.getElementById('boxEscopoAgenda');
    
    if(!modal) return;
    
    titulo.innerText = "✏️ Editar Atendimento / Recorrência";
    document.getElementById('containerSelectPacienteAgendamento').style.display = 'none';
    boxEscopo.style.display = 'block';

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

        await executarSalvamentoPorEscopo(pacienteId, dataISO, novaData, novaHora, novaMod, novoVal, novoStat, escopo);
        fecharModalAgendamento();
        carregarAgendaSemanal();
    };

    modal.style.display = 'flex';
};

// ==========================================================================
// CALENDÁRIO INTERNO DO PERFIL (ATUALIZAÇÃO DINÂMICA E CORRETA DOS 90 DIAS)
// ==========================================================================
async function renderizarSidebarCalendarioPaciente(pacienteId) {
    const sidebar = document.getElementById('sidebar-agenda-paciente');
    const resumoBox = document.getElementById('info-plano-resumo');
    const listaScroll = document.getElementById('lista-proximas-sessoes');

    if (!sidebar || !resumoBox || !listaScroll) return;

    // Obtém as informações atuais dos inputs do formulário para o Live Preview!
    const dataInicioStr = document.getElementById('dataInicial')?.value;
    const frequencia = document.getElementById('frequencia')?.value || 'Semanal';
    const horaPadrao = document.getElementById('horario')?.value || '';
    const modalidade = document.getElementById('modalidade')?.value || 'Presencial';
    const valor = Number(document.getElementById('valor')?.value || 0);
    const diaSemana = document.getElementById('diaSemana')?.value || 'Segunda';

    // Se a data inicial estiver em branco, oculta a barra lateral e interrompe a renderização
    if (!dataInicioStr) {
        sidebar.style.display = 'none';
        return;
    }

    sidebar.style.display = 'block';
    resumoBox.innerHTML = `
        <strong>Frequência:</strong> ${frequencia}<br>
        <strong>Horário Fixo:</strong> ${horaPadrao.substring(0,5)}<br>
        <strong>Modalidade:</strong> ${modalidade}<br>
        <strong>Valor Base:</strong> R$ ${valor.toFixed(2)}
    `;

    listaScroll.innerHTML = '<div style="font-size:12px; padding:10px;">Calculando projeções em tempo real...</div>';

    try {
        let agendamentos = [];
        if (pacienteId && pacienteId !== 'null' && bancoDados) {
            const res = await bancoDados.from('agendamentos').select('*').eq('paciente_id', pacienteId);
            if (res.data) agendamentos = res.data;
        }

        let htmlProxe = '';
        
        // CRITICAL FIX: O loop inicia exatamente da Data de Início cadastrada no formulário
        const partes = dataInicioStr.split('-');
        const dataBaseLoop = new Date(partes[0], partes[1] - 1, partes[2]);

        for (let i = 0; i < 90; i++) {
            const dataFoco = new Date(dataBaseLoop.getFullYear(), dataBaseLoop.getMonth(), dataBaseLoop.getDate() + i);
            const dataISO = `${dataFoco.getFullYear()}-${String(dataFoco.getMonth() + 1).padStart(2, '0')}-${String(dataFoco.getDate()).padStart(2, '0')}`;

            const atendeRecorrencia = checarDataCorrespondeAoPlano(new Date(dataFoco), dataInicioStr, diaSemana, frequencia);
            const excecaoGravada = agendamentos.find(a => a.data === dataISO);

            if (atendeRecorrencia || excecaoGravada) {
                const exibData = `${String(dataFoco.getDate()).padStart(2, '0')}/${String(dataFoco.getMonth() + 1).padStart(2, '0')}/${dataFoco.getFullYear()}`;
                const exibHora = excecaoGravada ? excecaoGravada.hora.substring(0,5) : (horaPadrao ? horaPadrao.substring(0,5) : '--:--');
                const exibValor = excecaoGravada && excecaoGravada.valor_cobrado !== undefined ? excecaoGravada.valor_cobrado : valor;
                const exibMod = excecaoGravada && excecaoGravada.modalidade ? excecaoGravada.modalidade : modalidade;

                htmlProxe += `
                    <div class="container-linha-bloco">
                        <div class="linha-previsao">
                            <div class="linha-previsao-info">
                                <strong>📅 ${exibData} às ${exibHora}</strong>
                                <span>${frequencia} - R$ ${Number(exibValor).toFixed(2)} (${exibMod})</span>
                            </div>
                            <button type="button" class="btn-tres-pontos" onclick="alternarVisibilidadeEditorLinha('${dataISO}')">...</button>
                        </div>
                        
                        <div id="editor-painel-${dataISO}" class="box-editor-linha">
                            <div class="form-group">
                                <label>Alterar Data desta Sessão</label>
                                <input type="date" id="input-data-${dataISO}" value="${dataISO}">
                            </div>
                            <div class="form-group">
                                <label>Horário</label>
                                <input type="time" id="input-hora-${dataISO}" value="${exibHora}">
                            </div>
                            <div class="form-group">
                                <label>Valor Ocorrência (R$)</label>
                                <input type="number" id="input-valor-${dataISO}" value="${exibValor}" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Modalidade</label>
                                <select id="input-mod-${dataISO}">
                                    <option value="Presencial" ${exibMod === 'Presencial' ? 'selected' : ''}>Presencial</option>
                                    <option value="Online" ${exibMod === 'Online' ? 'selected' : ''}>Online</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="color: #e53e3e; font-weight:bold;">Onde aplicar alteração?</label>
                                <select id="input-escopo-${dataISO}">
                                    <option value="somente">Apenas para esta data específica</option>
                                    <option value="demais">Para esta data e todas as próximas abaixo</option>
                                </select>
                            </div>
                            <button type="button" class="btn-salvar" style="padding: 6px 12px; font-size: 11px; width: 100%;" onclick="salvarModificacaoLinhaPerfil('${dataISO}', '${pacienteId}')">Salvar Ajustes</button>
                        </div>
                    </div>
                `;
            }
        }
        listaScroll.innerHTML = htmlProxe || '<div style="font-size:12px; color:#718096; padding:10px;">Nenhum atendimento projetado com os parâmetros atuais.</div>';

    } catch (err) { 
        console.error(err); 
        listaScroll.innerHTML = '<div style="font-size:12px; color:red; padding:10px;">Erro ao processar projeção.</div>';
    }
}

window.alternarVisibilidadeEditorLinha = function(dataISO) {
    const el = document.getElementById(`editor-painel-${dataISO}`);
    if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
};

window.salvarModificacaoLinhaPerfil = async function(dataISO, pacienteId) {
    if (!pacienteId || pacienteId === 'null') {
        alert('Por favor, salve o cadastro básico do paciente primeiro antes de aplicar ajustes específicos por ocorrência.');
        return;
    }
    const novaData = document.getElementById(`input-data-${dataISO}`)?.value;
    const novaHora = document.getElementById(`input-hora-${dataISO}`)?.value;
    const novoVal = Number(document.getElementById(`input-valor-${dataISO}`)?.value || 0);
    const novaMod = document.getElementById(`input-mod-${dataISO}`)?.value;
    const escopo = document.getElementById(`input-escopo-${dataISO}`)?.value;

    await executarSalvamentoPorEscopo(pacienteId, dataISO, novaData, novaHora, novaMod, novoVal, 'Agendado', escopo);
    renderizarSidebarCalendarioPaciente(pacienteId);
};

// ==========================================================================
// CENTRALIZADOR LOGICO DO SALVAMENTO POR ESCOPO (VINCULA TUDO AUTOMATICAMENTE)
// ==========================================================================
async function executarSalvamentoPorEscopo(pacienteId, dataOriginalISO, novaDataISO, novaHora, novaMod, novoVal, status, escopo) {
    if(!bancoDados) return;

    try {
        if (escopo === 'somente') {
            const { data: existente } = await bancoDados.from('agendamentos').select('id').eq('paciente_id', pacienteId).eq('data', dataOriginalISO);
            
            const payload = { 
                paciente_id: pacienteId, 
                data: novaDataISO, 
                hora: novaHora, 
                modalidade: novaMod, 
                valor_cobrado: novoVal, 
                status: status 
            };

            if (existente && existente.length > 0) {
                await bancoDados.from('agendamentos').update(payload).eq('id', existente[0].id);
            } else {
                await bancoDados.from('agendamentos').insert([payload]);
            }
        } else {
            const partes = novaDataISO.split('-');
            const objData = new Date(partes[0], partes[1] - 1, partes[2]);
            const diasTexto = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const novoDiaSemanaCalculado = diasTexto[objData.getDay()];

            await bancoDados.from('planos_atendimento').update({
                data_inicio: novaDataISO,
                dia_semana: novoDiaSemanaCalculado,
                hora_padrao: novaHora,
                valor: novoVal,
                modalidade: novaMod
            }).eq('paciente_id', pacienteId);

            await bancoDados.from('agendamentos').delete().eq('paciente_id', pacienteId).gte('data', dataOriginalISO);
        }
        alert('Modificações consolidadas com sucesso em todo o sistema!');
    } catch(e) {
        console.error(e);
        alert('Falha ao processar salvamento unificado.');
    }
}

// ==========================================================================
// OPERAÇÃO: DASHBOARD CONTADORES
// ==========================================================================
async function atualizarDashboard() {
    if (!bancoDados) return;
    try {
        const { data } = await bancoDados.from('pacientes').select('status');
        let ativos = 0, inativos = 0;
        if (data) {
            data.forEach(p => p.status === 'Inativo' ? inativos++ : ativos++);
        }
        if (document.getElementById('totalAtivos')) document.getElementById('totalAtivos').innerText = ativos;
        if (document.getElementById('totalInativos')) document.getElementById('totalInativos').innerText = inativos;
    } catch (err) { console.error(err); }
}

// ==========================================================================
// OPERAÇÃO: PACIENTES (CRUD E VER PERFIL)
// ==========================================================================
async function carregarPacientes() {
    if (!bancoDados) return;
    const lista = document.getElementById('listaPacientes');
    if (!lista) return;
    lista.innerHTML = '<div>Buscando listagem...</div>';

    try {
        const { data, error } = await bancoDados.from('pacientes').select('*').order('nome');
        if (error) throw error;
        if (!data || data.length === 0) {
            lista.innerHTML = '<div>Nenhum paciente localizado.</div>';
            return;
        }

        let html = '';
        data.forEach(paciente => {
            html += `
                <div class="cardPaciente" id="card-${paciente.id}">
                    <strong>👤 ${paciente.nome || ''}</strong><br>
                    <small>📞 WhatsApp: ${paciente.telefone || 'Não preenchido'}</small><br>
                    <small>🟢 Situação: ${paciente.status || 'Ativo'}</small>
                    <div class="acoes-card">
                        <button class="btn-editar" onclick="prepararEdicaoPaciente('${paciente.id}')">✏️ Ver Perfil / Calendário</button>
                        <button class="btn-excluir" onclick="excluirPaciente('${paciente.id}')">🗑️ Remover</button>
                    </div>
                </div>
            `;
        });
        lista.innerHTML = html;
    } catch (err) { lista.innerHTML = '<div style="color:red;">Falha ao carregar.</div>'; }
}

window.prepararEdicaoPaciente = async function(id) {
    idPacienteEditando = id;
    try {
        const { data } = await bancoDados.from('pacientes').select('*').eq('id', id);
        const p = data[0];

        mostrarTela('novoPaciente');

        if(document.getElementById('nome')) document.getElementById('nome').value = p.nome || '';
        if(document.getElementById('cpf')) document.getElementById('cpf').value = p.cpf || '';
        if(document.getElementById('telefone')) document.getElementById('telefone').value = p.telefone || '';
        if(document.getElementById('email')) document.getElementById('email').value = p.email || '';
        if(document.getElementById('dataNascimento')) document.getElementById('dataNascimento').value = p.data_nascimento || '';
        if(document.getElementById('endereco')) document.getElementById('endereco').value = p.endereco || '';
        if(document.getElementById('responsavel')) document.getElementById('responsavel').value = p.responsavel || '';
        if(document.getElementById('observacoes')) document.getElementById('observacoes').value = p.observacoes || '';
        if(document.getElementById('statusPaciente')) document.getElementById('statusPaciente').value = p.status || 'Ativo';

        const planoRes = await bancoDados.from('planos_atendimento').select('*').eq('paciente_id', id);
        if (planoRes.data && planoRes.data.length > 0) {
            const pl = planoRes.data[0];
            if(document.getElementById('dataInicial')) document.getElementById('dataInicial').value = pl.data_inicio || '';
            if(document.getElementById('diaSemana')) document.getElementById('diaSemana').value = pl.dia_semana || 'Segunda';
            if(document.getElementById('frequencia')) document.getElementById('frequencia').value = pl.frequencia || 'Semanal';
            if(document.getElementById('horario')) document.getElementById('horario').value = pl.hora_padrao || '';
            if(document.getElementById('modalidade')) document.getElementById('modalidade').value = pl.modalidade || 'Presencial';
            if(document.getElementById('valor')) document.getElementById('valor').value = pl.valor || '';
            if(document.getElementById('formaCobranca')) document.getElementById('formaCobranca').value = pl.forma_cobranca || 'Mensal';
        }

        renderizarSidebarCalendarioPaciente(id);
    } catch (err) { alert('Erro na busca de dados.'); }
};

window.excluirPaciente = async function(id) {
    if (!confirm("Remover este paciente permanentemente?")) return;
    try {
        await bancoDados.from('planos_atendimento').delete().eq('paciente_id', id);
        await bancoDados.from('agendamentos').delete().eq('paciente_id', id);
        await bancoDados.from('pacientes').delete().eq('id', id);
        carregarPacientes();
        atualizarDashboard();
    } catch (err) { alert('Erro ao processar exclusão.'); }
};

// SALVAMENTO REMODELADO PARA MANTER O OPERADOR NA MESMA TELA
async function salvarPaciente() {
    if (!bancoDados) return;
    try {
        const elNome = document.getElementById('nome');
        if (!elNome || !elNome.value) { alert('Nome é obrigatório'); return; }

        const payloadPaciente = {
            nome: elNome.value,
            cpf: document.getElementById('cpf')?.value || null,
            telefone: document.getElementById('telefone')?.value || null,
            email: document.getElementById('email')?.value || null,
            data_nascimento: document.getElementById('dataNascimento')?.value || null,
            endereco: document.getElementById('endereco')?.value || null,
            responsavel: document.getElementById('responsavel')?.value || null,
            observacoes: document.getElementById('observacoes')?.value || null,
            status: document.getElementById('statusPaciente')?.value || 'Ativo',
            ativo: document.getElementById('statusPaciente')?.value === 'Ativo'
        };

        const selectDia = document.getElementById('diaSemana');
        const payloadPlano = {
            data_inicio: document.getElementById('dataInicial')?.value || null,
            dia_semana: selectDia ? selectDia.value : 'Segunda',
            frequencia: document.getElementById('frequencia')?.value || 'Semanal',
            hora_padrao: document.getElementById('horario')?.value || null,
            modalidade: document.getElementById('modalidade')?.value || 'Presencial',
            valor: Number(document.getElementById('valor')?.value || 0),
            forma_cobranca: document.getElementById('formaCobranca')?.value || 'Mensal',
            ativo: true
        };

        if (idPacienteEditando) {
            await bancoDados.from('pacientes').update(payloadPaciente).eq('id', idPacienteEditando);
            await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', idPacienteEditando);
            alert('Cadastro atualizado com sucesso!');
            
            // FIX: Mantém o idPacienteEditando e atualiza a barra lateral imediatamente
            renderizarSidebarCalendarioPaciente(idPacienteEditando);
        } else {
            const resPac = await bancoDados.from('pacientes').insert([payloadPaciente]).select('id');
            if (resPac.error) throw resPac.error;
            
            const novoId = resPac.data[0].id;
            payloadPlano.paciente_id = novoId;
            await bancoDados.from('planos_atendimento').insert([payloadPlano]);
            alert('Paciente e plano gravados com sucesso!');
            
            // FIX: Associa o novo ID criado para travar o escopo de edição na mesma tela
            idPacienteEditando = novoId;
            renderizarSidebarCalendarioPaciente(novoId);
        }
    } catch (erro) { alert('Erro ao salvar os dados.'); }
}

// ==========================================================================
// CONTROLES DO MODAL POP-UP
// ==========================================================================
async function abrirModalAgendamento() {
    const modal = document.getElementById('modalAgendamento');
    const select = document.getElementById('selectPacienteAgendamento');
    const titulo = document.getElementById('modalAgendamentoTitulo');
    const boxEscopo = document.getElementById('boxEscopoAgenda');
    
    if (!modal || !select || !bancoDados) return;

    titulo.innerText = "📅 Marcar Nova Sessão";
    document.getElementById('containerSelectPacienteAgendamento').style.display = 'block';
    boxEscopo.style.display = 'none';
    select.innerHTML = '<option value="">Carregando...</option>';
    modal.style.display = 'flex';

    document.getElementById('btnPersistirAgendamento').onclick = salvarAgendamento;

    try {
        const { data } = await bancoDados.from('pacientes').select('id, nome').eq('status', 'Ativo').order('nome');
        if (data && data.length > 0) {
            select.innerHTML = '<option value="">-- Selecione --</option>';
            data.forEach(p => select.innerHTML += `<option value="${p.id}">${p.nome}</option>`);
        }
    } catch (err) { select.innerHTML = '<option value="">Erro</option>'; }
}
window.abrirModalAgendamento = abrirModalAgendamento;

function fecharModalAgendamento() {
    document.getElementById('modalAgendamento').style.display = 'none';
    document.getElementById('formAgendamento')?.reset();
}
window.fecharModalAgendamento = fecharModalAgendamento;

async function salvarAgendamento() {
    if (!bancoDados) return;
    const pacienteId = document.getElementById('selectPacienteAgendamento')?.value;
    const dataSessao = document.getElementById('dataAgendamento')?.value;
    const horaSessao = document.getElementById('horaAgendamento')?.value;
    const statusSessao = document.getElementById('statusAgendamento')?.value || 'Agendado';
    const modSessao = document.getElementById('modalidadeAgendamento')?.value || 'Presencial';
    const valSessao = Number(document.getElementById('valorAgendamento')?.value || 0);

    if (!pacienteId || !dataSessao || !horaSessao) return;

    try {
        await bancoDados.from('agendamentos').insert([{ 
            paciente_id: pacienteId, 
            data: dataSessao, 
            hora: horaSessao, 
            status: statusSessao,
            modalidade: modSessao,
            valor_cobrado: valSessao
        }]);
        fecharModalAgendamento();
        carregarAgendaSemanal();
    } catch (err) { alert('Erro ao registrar sessão manual.'); }
}

// ==========================================================================
// GESTÃO CONFIGURAÇÕES VISUAIS COM INPUT DE SUBTÍTULO
// ==========================================================================
function salvarConfiguracoes() {
    const config = {
        nomeSistema: document.getElementById('configNomeSistema')?.value || 'Agenda Psicóloga',
        subtituloSistema: document.getElementById('configSubtituloSistema')?.value || '',
        corMenu: document.getElementById('corMenu')?.value || '#2c3e50',
        corPrincipal: document.getElementById('corPrincipal')?.value || '#1abc9c',
        corFundo: document.getElementById('corFundo')?.value || '#f5f7fa',
        modoEscuro: document.getElementById('modoEscuro')?.checked || false
    };
    localStorage.setItem('agenda_psi_config', JSON.stringify(config));
    
    const logoInput = document.getElementById('configLogo');
    if (logoInput?.files?.[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            localStorage.setItem('agenda_psi_logo', e.target.result);
            aplicarConfiguracoesVisuais();
        };
        reader.readAsDataURL(logoInput.files[0]);
    } else { aplicarConfiguracoesVisuais(); }
    alert('Configurações aplicadas!');
}

function carregarConfiguracoesCampos() {
    const salvo = localStorage.getItem('agenda_psi_config');
    if (!salvo) return;
    const config = JSON.parse(salvo);
    if(document.getElementById('configNomeSistema')) document.getElementById('configNomeSistema').value = config.nomeSistema;
    if(document.getElementById('configSubtituloSistema')) document.getElementById('configSubtituloSistema').value = config.subtituloSistema || '';
    if(document.getElementById('corMenu')) document.getElementById('corMenu').value = config.corMenu;
    if(document.getElementById('corPrincipal')) document.getElementById('corPrincipal').value = config.corPrincipal;
    if(document.getElementById('corFundo')) document.getElementById('corFundo').value = config.corFundo;
    if(document.getElementById('modoEscuro')) document.getElementById('modoEscuro').checked = config.modoEscuro;
}

function aplicarConfiguracoesVisuais() {
    const salvo = localStorage.getItem('agenda_psi_config');
    const logoSalva = localStorage.getItem('agenda_psi_logo');
    
    if (salvo) {
        const config = JSON.parse(salvo);
        const elNome = document.getElementById('nomeSistema');
        const elSub = document.getElementById('subtituloSistema');
        
        if (elNome) elNome.innerText = config.nomeSistema;
        if (elSub) elSub.innerText = config.subtituloSistema || ''; 
        document.title = config.nomeSistema;
        
        document.documentElement.style.setProperty('--cor-menu', config.corMenu);
        document.documentElement.style.setProperty('--cor-principal', config.corPrincipal);
        document.documentElement.style.setProperty('--cor-fundo', config.corFundo);
        if (config.modoEscuro) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }
    const imgLogo = document.getElementById('logoSistema');
    if (imgLogo && logoSalva) { imgLogo.src = logoSalva; imgLogo.style.display = 'block'; }
}
