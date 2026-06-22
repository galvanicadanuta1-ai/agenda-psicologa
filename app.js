// ==========================================================================
// CONFIGURAÇÕES DE CONEXÃO DO SUPABASE
// ==========================================================================
const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2JrY2xvZnNucm9wc3NyYWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODg3NjcsImV4cCI6MjA5Njc2NDc2N30._8_tmYoRlyEhARjXZ3swW8ynCPY5aysGMFCTzgcnK5Y';

let bancoDados;
if (window.supabase) {
    bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro crítico: A biblioteca Supabase não carregou via CDN.");
}

// Controle de Estado de Edição (Armazena ID do paciente sob alteração)
let idPacienteEditando = null;

// ==========================================================================
// NAVEGAÇÃO INTERNA SPA (ROUTING SEGURO)
// ==========================================================================
function mostrarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach(tela => tela.style.display = 'none');
    
    const telaAlvo = document.getElementById(nomeTela);
    if (telaAlvo) telaAlvo.style.display = 'block';

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
                
                const form = document.getElementById('formPaciente');
                if (form) form.reset();
            }
            break;
        case 'configuracoes':
            carregarConfiguracoesCampos();
            break;
    }
}
window.mostrarTela = mostrarTela;

// ==========================================================================
// INICIALIZAÇÃO DE EVENTOS DO SISTEMA
// ==========================================================================
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
    const nomeDia = diasDaSemana[dataObjeto.getDay()];
    
    const selectDia = document.getElementById('diaSemana');
    if (selectDia) {
        if (nomeDia === 'Domingo') {
            alert('Atenção: A data selecionada cai em um Domingo. Ajustando para Segunda-feira.');
            selectDia.value = 'Segunda';
        } else {
            selectDia.value = nomeDia;
        }
    }
}

// ==========================================================================
// OPERAÇÃO: DASHBOARD CONTADORES
// ==========================================================================
async function atualizarDashboard() {
    if (!bancoDados) return;
    try {
        const { data, error } = await bancoDados.from('pacientes').select('status');
        if (error) throw error;
        
        let ativos = 0, inativos = 0;
        if (data) {
            data.forEach(p => p.status === 'Inativo' ? inativos++ : ativos++);
        }
        
        const elAtivos = document.getElementById('totalAtivos');
        const elInativos = document.getElementById('totalInativos');
        if (elAtivos) elAtivos.innerText = ativos;
        if (elInativos) elInativos.innerText = inativos;
    } catch (err) { console.error("Erro processamento Dashboard:", err); }
}

// ==========================================================================
// OPERAÇÃO: PACIENTES (CRUD COMPLETO)
// ==========================================================================
async function carregarPacientes() {
    if (!bancoDados) return;
    const lista = document.getElementById('listaPacientes');
    if (!lista) return;
    lista.innerHTML = '<div class="carregando">Carregando pacientes cadastrados...</div>';

    try {
        const { data, error } = await bancoDados.from('pacientes').select('*').order('nome');
        if (error) throw error;
        if (!data || data.length === 0) {
            lista.innerHTML = '<div style="padding:10px;">Nenhum paciente cadastrado no sistema.</div>';
            return;
        }

        let html = '';
        data.forEach(paciente => {
            html += `
                <div class="cardPaciente" id="card-${paciente.id}">
                    <strong>👤 ${paciente.nome || ''}</strong><br>
                    <small>📞 Telefone: ${paciente.telefone || 'Não informado'}</small><br>
                    <small>🟢 Status: ${paciente.status || 'Ativo'}</small>
                    <div class="acoes-card">
                        <button class="btn-editar" onclick="prepararEdicaoPaciente('${paciente.id}')">✏️ Editar</button>
                        <button class="btn-excluir" onclick="excluirPaciente('${paciente.id}')">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        lista.innerHTML = html;
    } catch (err) { lista.innerHTML = '<div style="padding:10px; color:red;">Erro ao processar listagem.</div>'; }
}

window.prepararEdicaoPaciente = async function(id) {
    idPacienteEditando = id;
    try {
        const { data, error } = await bancoDados.from('pacientes').select('*').eq('id', id);
        if (error) throw error;
        const p = data[0];

        const tituloForm = document.querySelector('#novoPaciente h2');
        const btnSalvar = document.getElementById('btnSalvarPaciente');
        if (tituloForm) tituloForm.innerText = "Editar Perfil do Paciente";
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
    } catch (err) { alert('Erro ao coletar dados do perfil.'); }
};

window.excluirPaciente = async function(id) {
    if (!confirm("Tem certeza absoluta que deseja excluir este paciente? Isso apagará permanentemente o perfil e o plano de atendimento associado.")) return;
    try {
        await bancoDados.from('planos_atendimento').delete().eq('paciente_id', id);
        const { error } = await bancoDados.from('pacientes').delete().eq('id', id);
        if (error) throw error;

        alert('Paciente e plano de atendimento removidos com sucesso!');
        carregarPacientes();
        atualizarDashboard();
    } catch (err) { alert('Falha ao processar exclusão no banco de dados.'); }
};

document.addEventListener('input', function (e) {
    if (e.target.id !== 'pesquisaPaciente') return;
    const filtro = e.target.value.toLowerCase();
    document.querySelectorAll('.cardPaciente').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(filtro) ? 'block' : 'none';
    });
});

// ==========================================================================
// SALVAR OU ATUALIZAR MÓDULO FORMULÁRIO + AGENDAMENTO AUTOMÁTICO
// ==========================================================================
async function salvarPaciente() {
    if (!bancoDados) return;
    try {
        const elNome = document.getElementById('nome');
        if (!elNome || !elNome.value) { alert('Informe o nome do paciente'); return; }

        const dataInicioForm = document.getElementById('dataInicial')?.value || null;
        const horaPadraoForm = document.getElementById('horario')?.value || null;

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
            data_inicio: dataInicioForm,
            dia_semana: document.getElementById('diaSemana')?.value || 'Segunda',
            frequencia: document.getElementById('frequencia')?.value || 'Semanal',
            hora_padrao: horaPadraoForm,
            modalidade: document.getElementById('modalidade')?.value || 'Presencial',
            valor: Number(document.getElementById('valor')?.value || 0),
            forma_cobranca: document.getElementById('formaCobranca')?.value || 'Mensal',
            ativo: true
        };

        if (idPacienteEditando) {
            const resPac = await bancoDados.from('pacientes').update(payloadPaciente).eq('id', idPacienteEditando);
            if (resPac.error) throw resPac.error;

            await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', idPacienteEditando);
            alert('Perfil do paciente atualizado com sucesso!');
            idPacienteEditando = null;
        } else {
            // Cadastro de Novo Paciente
            const resPac = await bancoDados.from('pacientes').insert([payloadPaciente]).select('id');
            if (resPac.error) throw resPac.error;

            const novoIdPaciente = resPac.data[0].id;
            payloadPlano.paciente_id = novoIdPaciente;
            await bancoDados.from('planos_atendimento').insert([payloadPlano]);

            // NOVO: Geração automática do compromisso na agenda baseada na data de início do cadastro
            if (dataInicioForm && horaPadraoForm) {
                await bancoDados.from('agendamentos').insert([
                    {
                        paciente_id: novoIdPaciente,
                        data: dataInicioForm,
                        hora: horaPadraoForm,
                        status: 'Agendado'
                    }
                ]);
            }
            alert('Paciente salvo e inserido na agenda com sucesso!');
        }

        document.getElementById('formPaciente')?.reset();
        mostrarTela('pacientes');
    } catch (erro) { alert('Erro no salvamento. Verifique as permissões de escrita do banco.'); }
}

// ==========================================================================
// RENDERIZAÇÃO DA AGENDA SEMANAL DINÂMICA (SEMANA ATUAL + 4 SEMANAS)
// ==========================================================================
async function carregarAgendaSemanal() {
    if (!bancoDados) return;
    
    const containerGeral = document.getElementById('grade-agenda-container');
    if (!containerGeral) return;
    containerGeral.innerHTML = '<div style="padding: 20px;">Calculando períodos e mapeando horários...</div>';

    // 1. Encontrar a segunda-feira da semana corrente
    const hoje = new Date();
    const diaDaSemanaAtual = hoje.getDay(); // 0 = Domingo, 1 = Segunda...
    const diferencaParaSegunda = diaDaSemanaAtual === 0 ? -6 : 1 - diaDaSemanaAtual;
    
    const segundaFeiraCorrente = new Date(hoje);
    segundaFeiraCorrente.setDate(hoje.getDate() + diferencaParaSegunda);

    let htmlSemanas = '';
    const nomesDiasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Construção das 5 semanas (S=0 é a corrente, S=1,2,3,4 são as seguintes)
    for (let s = 0; s < 5; s++) {
        const dataInicioBloco = new Date(segundaFeiraCorrente);
        dataInicioBloco.setDate(segundaFeiraCorrente.getDate() + (s * 7));

        const dataFimBloco = new Date(dataInicioBloco);
        dataFimBloco.setDate(dataInicioBloco.getDate() + 5); // Sábado

        const formatarDataSimples = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

        htmlSemanas += `
            <div class="semana-bloco">
                <div class="semana-titulo">📅 Semana: de ${formatarDataSimples(dataInicioBloco)} a ${formatarDataSimples(dataFimBloco)}</div>
                <div class="grade-agenda">
        `;

        for (let d = 0; d < 6; d++) {
            const dataDiaEspecifico = new Date(dataInicioBloco);
            dataDiaEspecifico.setDate(dataInicioBloco.getDate() + d);

            // Geração de chaves seguras livre de fusos horários (YYYY-MM-DD)
            const anoStr = dataDiaEspecifico.getFullYear();
            const mesStr = String(dataDiaEspecifico.getMonth() + 1).padStart(2, '0');
            const diaStr = String(dataDiaEspecifico.getDate()).padStart(2, '0');
            const dataISOChave = `${anoStr}-${mesStr}-${diaStr}`;

            const labelCabecalho = `${nomesDiasSemana[d]}. ${diaStr}/${mesStr}`;

            htmlSemanas += `
                <div class="coluna-dia">
                    <h3>${labelCabecalho}</h3>
                    <div class="slots-agendamentos" data-data-chave="${dataISOChave}"></div>
                </div>
            `;
        }

        htmlSemanas += `
                </div>
            </div>
        `;
    }

    containerGeral.innerHTML = htmlSemanas;

    // 2. Coletar agendamentos com relacionamento seguro do Supabase
    try {
        const { data, error } = await bancoDados
            .from('agendamentos')
            .select('id, data, hora, status, pacientes(nome, planos_atendimento(modalidade))')
            .order('hora');

        if (error) throw error;

        if (data && data.length > 0) {
            data.forEach(agendamento => {
                const dataChaveBanco = agendamento.data; // Formato retornado: YYYY-MM-DD
                
                // Busca os slots correspondentes gerados em tela que batem com essa data exata
                const containersAlvo = document.querySelectorAll(`.slots-agendamentos[data-data-chave="${dataChaveBanco}"]`);
                
                containersAlvo.forEach(container => {
                    const nomePaciente = agendamento.pacientes ? agendamento.pacientes.nome : 'Paciente Não Vinculado';
                    
                    // Tratamento seguro da propriedade encadeada da modalidade padrão
                    let modalidadeTexto = 'Presencial'; 
                    if (agendamento.pacientes && agendamento.pacientes.planos_atendimento) {
                        const planos = agendamento.pacientes.planos_atendimento;
                        if (Array.isArray(planos) && planos.length > 0) {
                            modalidadeTexto = planos[0].modalidade || 'Presencial';
                        } else if (typeof planos === 'object') {
                            modalidadeTexto = planos.modalidade || 'Presencial';
                        }
                    }

                    const horaFormatada = agendamento.hora ? agendamento.hora.substring(0, 5) : '--:--';

                    // Estrutura solicitada: Nome > Horário > Modalidade (um abaixo do outro)
                    container.innerHTML += `
                        <div class="card-compromisso">
                            <div class="card-paciente-nome">${nomePaciente}</div>
                            <div class="card-paciente-hora">⏱️ ${horaFormatada}</div>
                            <div class="card-paciente-modalidade">${modalidadeTexto}</div>
                        </div>
                    `;
                });
            });
        }
    } catch (err) { 
        console.error("Erro ao cruzar dados do banco com a grade estendida:", err); 
    }
}

// ==========================================================================
// CONTROLES DO MODAL POP-UP DE AGENDAMENTO
// ==========================================================================
async function abrirModalAgendamento() {
    const modal = document.getElementById('modalAgendamento');
    const select = document.getElementById('selectPacienteAgendamento');
    if (!modal || !select || !bancoDados) return;

    select.innerHTML = '<option value="">Carregando pacientes...</option>';
    modal.style.display = 'flex';

    try {
        const { data, error } = await bancoDados.from('pacientes').select('id, nome').eq('status', 'Ativo').order('nome');
        if (error) throw error;
        
        if (data && data.length > 0) {
            select.innerHTML = '<option value="">-- Escolha o Paciente --</option>';
            data.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Nenhum paciente ativo encontrado</option>';
        }
    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
    }
}
window.abrirModalAgendamento = abrirModalAgendamento;

function fecharModalAgendamento() {
    const modal = document.getElementById('modalAgendamento');
    if (modal) modal.style.display = 'none';
    document.getElementById('formAgendamento')?.reset();
}
window.fecharModalAgendamento = fecharModalAgendamento;

async function salvarAgendamento() {
    if (!bancoDados) return;
    
    const pacienteId = document.getElementById('selectPacienteAgendamento')?.value;
    const dataSessao = document.getElementById('dataAgendamento')?.value;
    const horaSessao = document.getElementById('horaAgendamento')?.value;
    const statusSessao = document.getElementById('statusAgendamento')?.value || 'Agendado';

    if (!pacienteId || !dataSessao || !horaSessao) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }

    try {
        const { error } = await bancoDados.from('agendamentos').insert([
            { 
                paciente_id: pacienteId, 
                data: dataSessao, 
                hora: horaSessao, 
                status: statusSessao 
            }
        ]);
        
        if (error) throw error;

        alert('Sessão agendada com sucesso!');
        fecharModalAgendamento();
        carregarAgendaSemanal();
    } catch (err) {
        alert('Erro ao salvar agendamento. Garanta que a política RLS da tabela "agendamentos" esteja liberada.');
    }
}
window.salvarAgendamento = salvarAgendamento;

// ==========================================================================
// CENTRALIZAÇÃO DA IDENTIDADE VISUAL E DESIGN
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
    alert('Configurações salvas e aplicadas!');
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

console.log('SISTEMA RENDERIZADO V5.0 MULTI-SEMANAS COMPLETO');
