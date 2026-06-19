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
    const inputData = document.getElementById('dataInicial');
    if (!inputData || !inputData.value) return;
    
    const partes = inputData.value.split('-');
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
        
        const elAtivos = document.getElementById('totalAtivos');
        const elInativos = document.getElementById('totalInativos');
        if (elAtivos) elAtivos.innerText = ativos;
        if (elInativos) elInativos.innerText = inativos;
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
    } catch (err) { alert('Erro ao buscar dados do paciente.'); }
};

window.excluirPaciente = async function(id) {
    if (!confirm("Tem certeza que deseja excluir este paciente? Isso apagará permanentemente o perfil e o plano de atendimento associados.")) return;
    try {
        await bancoDados.from('planos_atendimento').delete().eq('paciente_id', id);
        const { error } = await bancoDados.from('pacientes').delete().eq('id', id);
        if (error) throw error;

        alert('Paciente removido com sucesso!');
        carregarPacientes();
        atualizarDashboard();
    } catch (err) { alert('Erro ao excluir paciente.'); }
};

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
        const elNome = document.getElementById('nome');
        if (!elNome || !elNome.value) { alert('Informe o nome do paciente'); return; }

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
            const resPac = await bancoDados.from('pacientes').update(payloadPaciente).eq('id', idPacienteEditando);
            if (resPac.error) throw resPac.error;

            await bancoDados.from('planos_atendimento').update(payloadPlano).eq('paciente_id', idPacienteEditando);
            alert('Perfil do paciente updated!');
            idPacienteEditando = null;
        } else {
            const resPac = await bancoDados.from('pacientes').insert([payloadPaciente]).select('id');
            if (resPac.error) throw resPac.error;

            payloadPlano.paciente_id = resPac.data[0].id;
            await bancoDados.from('planos_atendimento').insert([payloadPlano]);
            alert('Paciente cadastrado com sucesso!');
        }

        document.getElementById('formPaciente')?.reset();
        mostrarTela('pacientes');
    } catch (erro) { alert('Erro na transação de salvamento.'); }
}

// ==========================================================================
// LÓGICA DE CARREGAMENTO DA AGENDA
// ==========================================================================
async function carregarAgendaSemanal() {
    if (!bancoDados) return;
    
    document.querySelectorAll('.slots-agendamentos').forEach(slot => slot.innerHTML = '');

    try {
        const { data, error } = await bancoDados
            .from('agendamentos')
            .select('id, data, hora, status, pacientes(nome)')
            .order('hora');

        if (error) throw error;

        if (data) {
            data.forEach(agendamento => {
                const partes = agendamento.data.split('-');
                const dataObj = new Date(partes[0], partes[1] - 1, partes[2]);
                const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const diaSemanaTexto = dias[dataObj.getDay()];

                const containerDia = document.querySelector(`#dia-${diaSemanaTexto} .slots-agendamentos`);
                
                if (containerDia) {
                    const nomePaciente = agendamento.pacientes ? agendamento.pacientes.nome : 'Paciente Removido';
                    containerDia.innerHTML += `
                        <div class="card-compromisso">
                            <strong>${agendamento.hora ? agendamento.hora.substring(0,5) : ''}</strong> - ${nomePaciente}
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
        nomeSistema: document.getElementById('configNomeSistema')?.value || 'Agenda Psicóloga',
        corMenu: document.getElementById('corMenu')?.value || '#333',
        corPrincipal: document.getElementById('corPrincipal')?.value || '#4CAF50',
        corFundo: document.getElementById('corFundo')?.value || '#f4f4f4',
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

console.log('APP V3.0 BLINDADO E ATUALIZADO');
