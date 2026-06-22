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
// NAVEGAÇÃO INTERNA SPA
// ==========================================================================
function mostrarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach(tela => tela.style.display = 'none');
    
    const telaAlvo = document.getElementById(nomeTela);
    if (telaAlvo) telaAlvo.style.display = 'block';

    // Reset padrão do sidebar de perfil
    const sidePerfil = document.getElementById('sidebar-agenda-paciente');
    if (sidePerfil) sidePerfil.style.display = 'none';

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
                const tituloForm = document.querySelector('#novoPaciente h2');
                if (tituloForm) tituloForm.innerText = "Novo Paciente";
                const btnSalvar = document.getElementById('btnSalvarPaciente');
                if (btnSalvar) btnSalvar.innerText = "Salvar Paciente";
                document.getElementById('formPaciente')?.reset();
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
    document.getElementById('dataInicial')?.addEventListener('change', atualizarDiaSemanaAutomatico);
    document.getElementById('btnPersistirAgendamento')?.addEventListener('click', salvarAgendamento);
});

function atualizarDiaSemanaAutomatico() {
    const inputData = document.getElementById('dataInicial');
    if (!inputData || !inputData.value) return;
    
    const partes = inputData.value.split('-');
    const dataObjeto = new Date(partes[0], partes[1] - 1, partes[2]);
    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    const selectDia = document.getElementById('diaSemana');
    if (selectDia) selectDia.value = diasDaSemana[dataObjeto.getDay()];
}

// ==========================================================================
// AUXILIAR MATEMÁTICO: CALCULA SE UMA DATA BATE COM A RECORRÊNCIA DO PLANO
// ==========================================================================
function checarDataCorrespondeAoPlano(dataAlvoObj, dataInicioStr, diaSemanaPlan, frequenciaPlan) {
    const partes = dataInicioStr.split('-');
    const dataInicioObj = new Date(partes[0], partes[1] - 1, partes[2]);
    
    // Zera horas para evitar divergência de fuso horário
    dataAlvoObj.setHours(0,0,0,0);
    dataInicioObj.setHours(0,0,0,0);

    if (dataAlvoObj < dataInicioObj) return false;

    const diasMapeamento = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    if (diasMapeamento[dataAlvoObj.getDay()] !== diaSemanaPlan) return false;

    const diferencaTime = Math.abs(dataAlvoObj - dataInicioObj);
    const diferencaDias = Math.ceil(diferencaTime / (1000 * 60 * 60 * 24));
    const diferencaSemanas = Math.floor(diferencaDias / 7);

    if (frequenciaPlan === 'Semanal') return true;
    if (frequenciaPlan === 'Quinzenal') return diferencaSemanas % 2 === 0;
    if (frequenciaPlan === 'Mensal') return diferencaSemanas % 4 === 0;

    return false;
}

// ==========================================================================
// RENDERIZAÇÃO DA AGENDA DINÂMICA (7 DIAS - INCLUINDO RECORRÊNCIAS AUTOMÁTICAS)
// ==========================================================================
async function carregarAgendaSemanal() {
    const containerGeral = document.getElementById('grade-agenda-container');
    if (!containerGeral) return;
    containerGeral.innerHTML = '<div style="padding: 10px;">Carregando grade com recorrências automáticas...</div>';

    const hoje = new Date();
    const diaSemanaAtual = hoje.getDay(); 
    const diffSegunda = diaSemanaAtual === 0 ? -6 : 1 - diaSemanaAtual;
    
    const segundaCorrente = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    segundaCorrente.setDate(segundaCorrente.getDate() + diffSegunda);

    let htmlSemanas = '';
    const nomesDiasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const formatarDataSimples = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 1. Monta a estrutura de casca das 5 semanas (7 Colunas por semana)
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

    // 2. Coleta de dados combinados do Banco
    try {
        const { data: pacientes } = await bancoDados.from('pacientes').select('id, nome').eq('status', 'Ativo');
        const { data: planos } = await bancoDados.from('planos_atendimento').select('*').eq('ativo', true);
        const { data: agendamentos } = await bancoDados.from('agendamentos').select('*');

        const mapaPacientes = {};
        if (pacientes) pacientes.forEach(p => mapaPacientes[p.id] = p.nome);

        // Varre cada uma das células injetadas na tela para calcular quem deve aparecer nela
        document.querySelectorAll('.slots-agendamentos').forEach(container => {
            const dataChaveStr = container.getAttribute('data-data-chave');
            const partes = dataChaveStr.split('-');
            const dataObjetoCelula = new Date(partes[0], partes[1] - 1, partes[2]);

            // Array para consolidação do que vai para a tela
            let itensRender = [];

            // A) Verifica se existem agendamentos explícitos ou exceções para este dia
            const especificosHoje = agendamentos ? agendamentos.filter(a => a.data === dataChaveStr) : [];
            especificosHoje.forEach(esp => {
                if(mapaPacientes[esp.paciente_id]) {
                    const planoOrigem = planos ? planos.find(pl => pl.paciente_id === esp.paciente_id) : null;
                    itensRender.push({
                        nome: mapaPacientes[esp.paciente_id],
                        hora: esp.hora.substring(0, 5),
                        modalidade: planoOrigem ? planoOrigem.modalidade : 'Presencial',
                        origem: 'excecao'
                    });
                }
            });

            // B) Calcula as recorrências automáticas baseadas nos Planos de Atendimento ativos
            if (planos) {
                planos.forEach(plano => {
                    // Evita duplicar se o paciente já possui uma linha explícita modificada na tabela de agendamentos deste dia
                    const possuiExcecaoHoje = especificosHoje.some(e => e.paciente_id === plano.paciente_id);
                    
                    if (!possuiExcecaoHoje && mapaPacientes[plano.paciente_id]) {
                        const corresponde = checarDataCorrespondeAoPlano(new Date(dataObjetoCelula), plano.data_inicio, plano.dia_semana, plano.frequencia);
                        if (corresponde) {
                            itensRender.push({
                                nome: mapaPacientes[plano.paciente_id],
                                hora: plano.hora_padrao ? plano.hora_padrao.substring(0, 5) : '--:--',
                                modalidade: plano.modalidade || 'Presencial',
                                origem: 'recorrente'
                            });
                        }
                    }
                });
            }

            // Injeta o conteúdo final consolidado na coluna do dia correto
            itensRender.forEach(item => {
                container.innerHTML += `
                    <div class="card-compromisso" style="${item.origem === 'excecao' ? 'border-left-color: #3182ce;' : ''}">
                        <div class="card-paciente-nome">${item.nome}</div>
                        <div class="card-paciente-hora">⏱️ ${item.hora}</div>
                        <div class="card-paciente-modalidade">${item.modalidade}</div>
                    </div>
                `;
            });
        });

    } catch (err) { console.error("Erro na compilação inteligente da agenda:", err); }
}

// ==========================================================================
// GERAÇÃO DO HISTÓRICO DE PROJEÇÃO DE 90 DIAS (SIDEBAR DO PACIENTE)
// ==========================================================================
async function renderizarSidebarCalendarioPaciente(pacienteId) {
    const sidebar = document.getElementById('sidebar-agenda-paciente');
    const resumoBox = document.getElementById('info-plano-resumo');
    const listaScroll = document.getElementById('lista-proximas-sessoes');

    if (!sidebar || !resumoBox || !listaScroll || !bancoDados) return;

    sidebar.style.display = 'block';
    resumoBox.innerHTML = 'Carregando plano...';
    listaScroll.innerHTML = '';

    try {
        const { data: planos } = await bancoDados.from('planos_atendimento').select('*').eq('paciente_id', pacienteId);
        if (!planos || planos.length === 0) {
            resumoBox.innerHTML = 'Nenhum plano configurado para o paciente.';
            return;
        }
        const plano = planos[0];
        
        resumoBox.innerHTML = `
            <strong>Frequência:</strong> ${plano.frequencia}<br>
            <strong>Horário Fixo:</strong> ${plano.hora_padrao ? plano.hora_padrao.substring(0,5) : ''}<br>
            <strong>Modalidade:</strong> ${plano.modalidade}<br>
            <strong>Investimento:</strong> R$ ${Number(plano.valor).toFixed(2)}
        `;

        // Coleta agendamentos gravados
        const { data: agendamentos } = await bancoDados.from('agendamentos').select('*').eq('paciente_id', pacienteId);

        let htmlProxe = '';
        const hojeLoop = new Date();

        // Loop dia por dia pelos próximos 90 dias
        for (let i = 0; i < 90; i++) {
            const dataFoco = new Date(hojeLoop.getFullYear(), hojeLoop.getMonth(), hojeLoop.getDate() + i);
            const dataISO = `${dataFoco.getFullYear()}-${String(dataFoco.getMonth() + 1).padStart(2, '0')}-${String(dataFoco.getDate()).padStart(2, '0')}`;

            const atendeRecorrencia = checarDataCorrespondeAoPlano(new Date(dataFoco), plano.data_inicio, plano.dia_semana, plano.frequencia);
            const excecaoGravada = agendamentos ? agendamentos.find(a => a.data === dataISO) : null;

            if (atendeRecorrencia || excecaoGravada) {
                const exibData = `${String(dataFoco.getDate()).padStart(2, '0')}/${String(dataFoco.getMonth() + 1).padStart(2, '0')}/${dataFoco.getFullYear()}`;
                const exibHora = excecaoGravada ? excecaoGravada.hora.substring(0,5) : (plano.hora_padrao ? plano.hora_padrao.substring(0,5) : '--:--');
                const exibValor = plano.valor || 0;

                htmlProxe += `
                    <div class="container-linha-bloco">
                        <div class="linha-previsao">
                            <div class="linha-previsao-info">
                                <strong>📅 ${exibData} às ${exibHora}</strong>
                                <span>${plano.frequencia} - R$ ${Number(exibValor).toFixed(2)} (${plano.modalidade})</span>
                            </div>
                            <button type="button" class="btn-tres-pontos" onclick="alternarVisibilidadeEditorLinha('${dataISO}')">...</button>
                        </div>
                        
                        <!-- Mini formulário expansível inline -->
                        <div id="editor-painel-${dataISO}" class="box-editor-linha">
                            <div class="form-group">
                                <label>Horário</label>
                                <input type="time" id="input-hora-${dataISO}" value="${exibHora}">
                            </div>
                            <div class="form-group">
                                <label>Frequência</label>
                                <select id="input-freq-${dataISO}">
                                    <option value="Semanal" ${plano.frequencia === 'Semanal' ? 'selected' : ''}>Semanal</option>
                                    <option value="Quinzenal" ${plano.frequencia === 'Quinzenal' ? 'selected' : ''}>Quinzenal</option>
                                    <option value="Mensal" ${plano.frequencia === 'Mensal' ? 'selected' : ''}>Mensal</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Valor da Sessão (R$)</label>
                                <input type="number" id="input-valor-${dataISO}" value="${exibValor}" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Modalidade</label>
                                <select id="input-mod-${dataISO}">
                                    <option value="Presencial" ${plano.modalidade === 'Presencial' ? 'selected' : ''}>Presencial</option>
                                    <option value="Online" ${plano.modalidade === 'Online' ? 'selected' : ''}>Online</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="color: #e53e3e; font-weight:bold;">Onde aplicar alteração?</label>
                                <select id="input-escopo-${dataISO}">
                                    <option value="somente">Apenas para esta data específica</option>
                                    <option value="demais">Para esta data e todas as próximas abaixo</option>
                                </select>
                            </div>
                            <button type="button" class="btn-salvar" style="padding: 6px 12px; font-size: 11px; width: 100%;" onclick="processarSalvamentoEscopoLinha('${dataISO}', '${pacienteId}')">Salvar Modificação</button>
                        </div>
                    </div>
                `;
            }
        }
        listaScroll.innerHTML = htmlProxe || '<div style="font-size:12px; color:#718096">Nenhuma sessão prevista encontrada.</div>';

    } catch (err) { console.error(err); }
}

window.alternarVisibilidadeEditorLinha = function(dataISO) {
    const el = document.getElementById(`editor-painel-${dataISO}`);
    if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
};

// ==========================================================================
// GRAVAÇÃO DE ALTERAÇÃO EXCLUSIVA COM SALVAMENTO EM ESCOPO (AVANÇADO)
// ==========================================================================
window.processarSalvamentoEscopoLinha = async function(dataISO, pacienteId) {
    if(!bancoDados) return;

    const novaHora = document.getElementById(`input-hora-${dataISO}`)?.value;
    const novaFreq = document.getElementById(`input-freq-${dataISO}`)?.value;
    const novoVal = Number(document.getElementById(`input-valor-${dataISO}`)?.value || 0);
    const novaMod = document.getElementById(`input-mod-${dataISO}`)?.value;
    const escopo = document.getElementById(`input-escopo-${dataISO}`)?.value;

    try {
        if (escopo === 'somente') {
            // Insere ou atualiza uma exceção pontual na tabela agendamentos para este dia específico
            const { data: existente } = await bancoDados.from('agendamentos').select('id').eq('paciente_id', pacienteId).eq('data', dataISO);
            
            if (existente && existente.length > 0) {
                await bancoDados.from('agendamentos').update({ hora: novaHora }).eq('id', existente[0].id);
            } else {
                await bancoDados.from('agendamentos').insert([{ paciente_id: pacienteId, data: dataISO, hora: novaHora, status: 'Agendado' }]);
            }
            alert('Alteração salva exclusivamente para este atendimento!');
        } else {
            // Escopo 'demais': Altera as diretrizes base no plano de atendimento a partir desta data sem mexer no histórico passado
            const partes = dataISO.split('-');
            const objData = new Date(partes[0], partes[1] - 1, partes[2]);
            const diasTexto = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const novoDiaSemanaCalculado = diasTexto[objData.getDay()];

            await bancoDados.from('planos_atendimento').update({
                data_inicio: dataISO,
                dia_semana: novoDiaSemanaCalculado,
                hora_padrao: novaHora,
                frequencia: novaFreq,
                valor: novoVal,
                modalidade: novaMod
            }).eq('paciente_id', pacienteId);

            // Deleta agendamentos manuais conflitantes futuros para que a nova regra assuma o controle limpo
            await bancoDados.from('agendamentos').delete().eq('paciente_id', pacienteId).gte('data', dataISO);

            alert('Plano atualizado! Esta sessão e as próximas datas foram reprogramadas com sucesso.');
        }

        // Sincroniza e atualiza todas as interfaces
        renderizarSidebarCalendarioPaciente(pacienteId);
        carregarAgendaSemanal();
    } catch (e) {
        alert('Erro ao processar atualização em escopo.');
    }
};

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
// OPERAÇÃO: PACIENTES (CRUD)
// ==========================================================================
async function carregarPacientes() {
    if (!bancoDados) return;
    const lista = document.getElementById('listaPacientes');
    if (!lista) return;
    lista.innerHTML = '<div>Carregando listagem profissional...</div>';

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
    } catch (err) { lista.innerHTML = '<div style="color:red;">Falha ao carregar listagem.</div>'; }
}

window.prepararEdicaoPaciente = async function(id) {
    idPacienteEditando = id;
    try {
        const { data } = await bancoDados.from('pacientes').select('*').eq('id', id);
        const p = data[0];

        const tituloForm = document.querySelector('#novoPaciente h2');
        const btnSalvar = document.getElementById('btnSalvarPaciente');
        if (tituloForm) tituloForm.innerText = "Perfil do Paciente";
        if (btnSalvar) btnSalvar.innerText = "Atualizar Dados";

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

        mostrarTela('novoPaciente');
        // Renderiza o novo painel lateral de recorrência de 90 dias
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

document.addEventListener('input', function (e) {
    if (e.target.id !== 'pesquisaPaciente') return;
    const filtro = e.target.value.toLowerCase();
    document.querySelectorAll('.cardPaciente').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(filtro) ? 'block' : 'none';
    });
});

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

        const payloadPlano = {
            data_inicio: document.getElementById('dataInicial')?.value || null,
            dia_semana: document.getElementById('diaSemana')?.value || 'Segunda',
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
            idPacienteEditando = null;
        } else {
            const resPac = await bancoDados.from('pacientes').insert([payloadPaciente]).select('id');
            if (resPac.error) throw resPac.error;
            payloadPlano.paciente_id = resPac.data[0].id;
            await bancoDados.from('planos_atendimento').insert([payloadPlano]);
            alert('Paciente e plano de recorrência gravados!');
        }

        document.getElementById('formPaciente')?.reset();
        mostrarTela('pacientes');
    } catch (erro) { alert('Erro ao salvar.'); }
}

// ==========================================================================
// CONTROLES DO MODAL POP-UP DE AGENDAMENTO EXPLICITO
// ==========================================================================
async function abrirModalAgendamento() {
    const modal = document.getElementById('modalAgendamento');
    const select = document.getElementById('selectPacienteAgendamento');
    if (!modal || !select || !bancoDados) return;

    select.innerHTML = '<option value="">Carregando...</option>';
    modal.style.display = 'flex';

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

    if (!pacienteId || !dataSessao || !horaSessao) return;

    try {
        await bancoDados.from('agendamentos').insert([{ paciente_id: pacienteId, data: dataSessao, hora: horaSessao, status: statusSessao }]);
        fecharModalAgendamento();
        carregarAgendaSemanal();
    } catch (err) { alert('Erro ao registrar sessão manual.'); }
}
window.salvarAgendamento = salvarAgendamento;

// ==========================================================================
// GESTÃO CONFIGURAÇÕES VISUAIS
// ==========================================================================
function salvarConfiguracoes() {
    const config = {
        nomeSistema: document.getElementById('configNomeSistema')?.value || 'Agenda Psicóloga',
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
        const elTitulo = document.getElementById('tituloSistema');
        if (elNome) elNome.innerText = config.nomeSistema;
        if (elTitulo) elTitulo.innerText = config.nomeSistema;
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

console.log('SISTEMA RENDERIZADO V7.0 COMPLETO - RECORRÊNCIA INTELIGENTE ATIVADA');
