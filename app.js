const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2JrY2xvZnNucm9wc3NyYWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODg3NjcsImV4cCI6MjA5Njc2NDc2N30._8_tmYoRlyEhARjXZ3swW8ynCPY5aysGMFCTzgcnK5Y';

let bancoDados;
if (window.supabase) {
    bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro crítico: Biblioteca Supabase não carregada.");
}

// Controle de Estado de Edição
let idPacienteEditando = null;

// ==========================================================================
// NAVEGAÇÃO INTERNA (SPA)
// ==========================================================================
function mostrarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach(tela => tela.style.display = 'none');
    
    const tela = document.getElementById(nomeTela);
    if (tela) tela.style.display = 'block';

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
                document.querySelector('#novoPaciente h2').innerText = "Novo Paciente";
                document.getElementById('btnSalvarPaciente').innerText = "Salvar Paciente";
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
// INICIALIZAÇÃO
// ==========================================================================
window.addEventListener('load', () => {
    aplicarConfiguracoesVisuais();
    mostrarTela('dashboard');
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnSalvarPaciente')?.addEventListener('click', salvarPaciente);
    document.getElementById('btnSalvarConfiguracoes')?.addEventListener('click', salvarConfiguracoes);
    document.getElementById('dataInicial')?.addEventListener('change', atualizarDiaSemanaAutomatico);
});

function atualizarDiaSemanaAutomatico() {
    const dataValor = document.getElementById('dataInicial').value;
    if (!dataValor) return;
    const partes = dataValor.split('-');
    const dataObjeto = new Date(partes[0], partes[1] - 1, partes[2]);
    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const nomeDia = diasDaSemana[dataObjeto.getDay()];
    const selectDia = document.getElementById('diaSemana');
    if (selectDia) {
        if (nomeDia === 'Domingo') {
            alert('Data cai em um Domingo. Ajustando para Segunda.');
            selectDia.value = 'Segunda';
        } else {
            selectDia.value = nomeDia;
        }
    }
}

// ==========================================================================
// DASHBOARD
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
        document.getElementById('totalAtivos').innerText = ativos;
        document.getElementById('totalInativos').innerText = inativos;
    } catch (err) { console.error("Erro Dashboard:", err); }
}

// ==========================================================================
// PACIENTES (LISTAGEM, BUSCA, EDIÇÃO E EXCLUSÃO)
// ==========================================================================
async function carregarPacientes() {
    if (!bancoDados) return;
    const lista = document.getElementById('listaPacientes');
    if (!lista) return;
    lista.innerHTML = '<div class="carregando">Carregando pacientes...</div>';

    try {
        const { data, error } = await bancoDados.from('pacientes').select('*').order('nome');
        if (error) throw error;
        if (!data || data.length === 0) {
            lista.innerHTML = 'Nenhum paciente cadastrado';
            return;
        }

        let html = '';
        data.forEach(paciente => {
            html += `
                <div class="cardPaciente" id="card-${paciente.id}">
                    <strong>${paciente.nome || ''}</strong><br>
                    <small>📞 Telefone: ${paciente.telefone || 'Não informado'}</small><br>
                    <small>🟢 Status: ${paciente.status || 'Ativo'}</small>
                    <div class="acoes-card">
                        <button class="btn-editar" onclick="prepararEdicaoPaciente('${paciente.id}')">✏️ Editar Perfil</button>
                        <button class="btn-excluir" onclick="excluirPaciente('${paciente.id}')">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        lista.innerHTML = html;
    } catch (err) { lista.innerHTML = 'Erro ao carregar pacientes'; }
}

window.prepararEdicaoPaciente = async function(id) {
    idPacienteEditando = id;
    try {
        const { data, error } = await bancoDados.from('pacientes').select('*').eq('id', id);
        if (error) throw error;
        const p = data[0];

        // Mudar visual da tela de cadastro
        document.querySelector('#novoPaciente h2').innerText = "Editar Perfil do Paciente";
        document.getElementById('btnSalvarPaciente').innerText = "Atualizar Dados";

        // Preencher dados cadastrais
        document.getElementById('nome').value = p.nome;
        document.getElementById('cpf').value = p.cpf || '';
        document.getElementById('telefone').value = p.telefone || '';
        document.getElementById('email').value = p.email || '';
        document.getElementById('dataNascimento').value = p.data_nascimento || '';
        document.getElementById('endereco').value = p.endereco || '';
        document.getElementById('responsavel').value = p.responsavel || '';
        document.getElementById('observacoes').value = p.observacoes || '';
        document.getElementById('statusPaciente').value = p.status;

        // Buscar dados do plano para preencher também
        const planoRes = await bancoDados.from('planos_atendimento').select('*').eq('paciente_id', id);
        if (planoRes.data && planoRes.data.length > 0) {
            const pl = planoRes.data[0];
            document.getElementById('dataInicial').value = pl.data_inicio || '';
            document.getElementById('diaSemana').value = pl.dia_semana;
            document.getElementById('frequencia').value = pl.frequencia;
            document.getElementById('horario').value = pl.hora_padrao || '';
            document.getElementById('modalidade').value = pl.modalidade;
            document.getElementById('valor').value = pl.valor || '';
            document.getElementById('formaCobranca').value = pl.forma_cobranca;
        }

        mostrarTela('novoPaciente');
    } catch (err) { alert('Erro ao buscar dados do paciente.'); }
};

window.excluirPaciente = async function(id) {
    if (!confirm("Tem certeza que deseja excluir este paciente? Isso apagará permanentemente o perfil e o plano de atendimento associados.")) return;
    try {
        // Deleta plano primeiro (regragem de integridade do banco)
        await bancoDados.from('planos_atendimento').delete().eq('paciente_id', id);
        // Deleta paciente
        const { error } = await bancoDados.from('pacientes').delete().eq('id', id);
        if (error) throw error;

        alert('Paciente removido com sucesso!');
        carregarPacientes();
        atualizarDashboard();
    } catch (err) { alert('Erro ao excluir paciente.'); }
};

// Mecanismo de Busca
document.addEventListener('input', function (e) {
    if (e.target.id !== 'pesquisaPaciente') return;
    const filtro = e.target.value.toLowerCase();
    document.querySelectorAll('.cardPaciente').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(filtro) ? 'block' : 'none';
    });
});

// ==========================================================================
// SALVAR OU ATUALIZAR PACIENTE
// ==========================================================================
async function salvarPaciente() {
    if (!bancoDados) return;
    try {
        const nome = document.getElementById('nome').value;
        if (!nome) { alert('Informe o nome do paciente'); return; }

        const payloadPaciente = {
            nome: nome,
            cpf: document.getElementById('cpf').value || null,
            telefone: document.getElementById('telefone').value || null,
            email: document.getElementById('email').value || null,
            data_nascimento: document.getElementById('dataNascimento').value || null,
            endereco: document.getElementById('endereco').value || null,
            responsavel: document.getElementById('responsavel').value || null,
            observacoes: document.getElementById('observacoes').value || null,
            status: document.getElementById('statusPaciente').value,
            ativo: document.getElementById('statusPaciente').value === 'Ativo'
        };

        const payloadPlano = {
            data_inicio: document.getElementById('dataInicial').value || null,
            dia_semana: document.getElementById('diaSemana').value,
            frequencia: document.getElementById('frequencia').value,
            hora_padrao: document.getElementById('horario').value || null,
            modalidade: document.getElementById('modalidade').value,
            valor: Number(document.getElementById('valor').value || 0),
            forma_cobranca: document.getElementById('formaCobranca').value,
            ativo: true
        };

        if (idPacienteEditando) {
            // OPERAÇÃO: ATUALIZAR
            const resPac = await bancoDados.from('pacientes').update(payloadPaciente).eq('id', idPacienteEditando);
            if (resPac.error) throw resPac.error;

            await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', idPacienteEditando);
            alert('Perfil do paciente atualizado com sucesso!');
            idPacienteEditando = null; // Reseta estado
        } else {
            // OPERAÇÃO: INSERIR NOVO
            const resPac = await bancoDados.from('pacientes').insert([payloadPaciente]).select('id');
            if (resPac.error) throw resPac.error;

            payloadPlano.paciente_id = resPac.data[0].id;
            await bancoDados.from('planos_atendimento').insert([payloadPlano]);
            alert('Paciente e plano cadastrados com sucesso!');
        }

        document.getElementById('formPaciente').reset();
        mostrarTela('pacientes');
    } catch (erro) { alert('Erro na transação de salvamento.'); }
}

// ==========================================================================
// LÓGICA DE CARREGAMENTO DA AGENDA
// ==========================================================================
async function carregarAgendaSemanal() {
    if (!bancoDados) return;
    
    // Limpar as colunas antes de renderizar
    document.querySelectorAll('.slots-agendamentos').forEach(slot => slot.innerHTML = '');

    try {
        // Buscaremos os dados da tabela agendamentos trazendo o nome do paciente associado
        const { data, error } = await bancoDados
            .from('agendamentos')
            .select('id, data, hora, status, pacientes(nome)')
            .order('hora');

        if (error) throw error;

        if (data) {
            data.forEach(agendamento => {
                // Cálculo para saber qual o dia da semana da data do agendamento
                const partes = agendamento.data.split('-');
                const dataObj = new Date(partes[0], partes[1] - 1, partes[2]);
                const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const diaSemanaTexto = dias[dataObj.getDay()];

                const containerDia = document.querySelector(`#dia-${diaSemanaTexto} .slots-agendamentos`);
                
                if (containerDia) {
                    const nomePaciente = agendamento.pacientes ? agendamento.pacientes.nome : 'Paciente Removido';
                    containerDia.innerHTML += `
                        <div class="card-compromisso">
                            <strong>${agendamento.hora.substring(0,5)}</strong> - ${nomePaciente}
                            <br><small>⏱️ ${agendamento.status || 'Agendado'}</small>
                        </div>
                    `;
                }
            });
        }
    } catch (err) { console.error("Erro ao carregar agenda:", err); }
}

// ==========================================================================
// CONFIGURAÇÕES GERAIS DA IDENTIDADE VISUAL
// ==========================================================================
function salvarConfiguracoes() {
    const config = {
        nomeSistema: document.getElementById('configNomeSistema').value || 'Agenda Psicóloga',
        corMenu: document.getElementById('corMenu').value,
        corPrincipal: document.getElementById('corPrincipal').value,
        corFundo: document.getElementById('corFundo').value,
        modoEscuro: document.getElementById('modoEscuro').checked
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
    document.getElementById('configNomeSistema').value = config.nomeSistema;
    document.getElementById('corMenu').value = config.corMenu;
    document.getElementById('corPrincipal').value = config.corPrincipal;
    document.getElementById('corFundo').value = config.corFundo;
    document.getElementById('modoEscuro').checked = config.modoEscuro;
}

function aplicarConfiguracoesVisuais() {
    const salvo = localStorage.getItem('agenda_psi_config');
    const logoSalva = localStorage.getItem('agenda_psi_logo');
    if (salvo) {
        const config = JSON.parse(salvo);
        document.getElementById('nomeSistema').innerText = config.nomeSistema;
        document.getElementById('tituloSistema').innerText = config.nomeSistema;
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
