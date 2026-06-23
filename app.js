// ==========================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
// ==========================================================================
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co"; 
const SUPABASE_KEY = "SUA_CHAVE_ANON_KEY"; 

const bancoDados = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================================================
// ENGINE CENTRAL DE PERSISTÊNCIA (COM CAPTURA DE ERROS DO SUPABASE)
// ==========================================================================
async function executarSalvamentoPorEscopo(pacienteId, dataOriginalISO, novaDataISO, novaHora, novaMod, novoVal, statusSessao, escopo, novaFreq) {
    if(!bancoDados) {
        alert("Erro crítico: Conexão com o banco de dados não inicializada.");
        return;
    }

    // Normaliza e força o formato HH:MM:SS exigido pelo PostgreSQL
    let horaFormatada = novaHora;
    if (horaFormatada && horaFormatada.length === 5) {
        horaFormatada += ':00';
    }

    try {
        if (escopo === 'somente') {
            const payload = { 
                paciente_id: pacienteId, 
                data: novaDataISO, 
                hora: horaFormatada, 
                modalidade: novaMod, 
                valor_cobrado: novoVal, 
                status: statusSessao 
            };

            if (novaDataISO !== dataOriginalISO) {
                // 1. Remove/Cancela a data antiga para evitar duplicidade na agenda
                const { data: extOrig, error: errOrig } = await bancoDados.from('agendamentos').select('id').eq('paciente_id', pacienteId).eq('data', dataOriginalISO);
                if (errOrig) throw errOrig;

                if (extOrig && extOrig.length > 0) {
                    const { error: errUpdOrig } = await bancoDados.from('agendamentos').update({ status: 'Cancelado' }).eq('id', extOrig[0].id);
                    if (errUpdOrig) throw errUpdOrig;
                } else {
                    const { error: errInsOrig } = await bancoDados.from('agendamentos').insert([{ paciente_id: pacienteId, data: dataOriginalISO, hora: horaFormatada, status: 'Cancelado', modalidade: novaMod, valor_cobrado: novoVal }]);
                    if (errInsOrig) throw errInsOrig;
                }
                
                // 2. Insere ou atualiza os dados na nova data escolhida
                const { data: extNova, error: errExtNova } = await bancoDados.from('agendamentos').select('id').eq('paciente_id', pacienteId).eq('data', novaDataISO);
                if (errExtNova) throw errExtNova;

                if (extNova && extNova.length > 0) {
                    const { error: errUpdNova } = await bancoDados.from('agendamentos').update(payload).eq('id', extNova[0].id);
                    if (errUpdNova) throw errUpdNova;
                } else {
                    const { error: errInsNova } = await bancoDados.from('agendamentos').insert([payload]);
                    if (errInsNova) throw errInsNova;
                }
            } else {
                // Atualização na mesma data corrente
                const { data: existente, error: errExistente } = await bancoDados.from('agendamentos').select('id').eq('paciente_id', pacienteId).eq('data', dataOriginalISO);
                if (errExistente) throw errExistente;

                if (existente && existente.length > 0) {
                    const { error: errUpdExistente } = await bancoDados.from('agendamentos').update(payload).eq('id', existente[0].id);
                    if (errUpdExistente) throw errUpdExistente;
                } else {
                    const { error: errInsExistente } = await bancoDados.from('agendamentos').insert([payload]);
                    if (errInsExistente) throw errInsExistente;
                }
            }
        } else {
            // Escopo: Desta data em diante (Altera o plano base recorrente)
            const partes = novaDataISO.split('-');
            const objData = new Date(partes[0], partes[1] - 1, partes[2]);
            const diasTexto = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const novoDiaSemanaCalculado = diasTexto[objData.getDay()];

            const payloadPlano = {
                data_inicio: novaDataISO,
                dia_semana: novoDiaSemanaCalculado,
                hora_padrao: horaFormatada,
                valor: novoVal,
                modalidade: novaMod
            };
            if (novaFreq) payloadPlano.frequencia = novaFreq;

            const { error: errPlano } = await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', pacienteId);
            if (errPlano) throw errPlano;
            
            // Remove registros manuais futuros para que o novo padrão assuma sem travar
            const { error: errDelAgend } = await bancoDados.from('agendamentos').delete().eq('paciente_id', pacienteId).gte('data', dataOriginalISO);
            if (errDelAgend) throw errDelAgend;
        }
        
        alert('Modificações salvas com sucesso!');
        
    } catch(e) {
        console.error("Erro detalhado retornado pelo Supabase:", e);
        alert(`Erro ao persistir informações: ${e.message || e.details || 'Falha de comunicação ou restrição de coluna.'}`);
    }
}

function dispararFluxoSafeguard() {
    // Gatilho de teste do formulário
    // executarSalvamentoPorEscopo(1, '2026-06-22', '2026-06-22', '14:00', 'Presencial', 150.00, 'Confirmado', 'somente');
}

function abrirEdicao(id, data) {
    console.log(`Carregando paciente ID ${id} da data ${data}...`);
}
