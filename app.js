const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GEjXlZTuzGDooj56xp9oWg_4cgxRK_C';

// Inicialização segura do cliente Supabase
let bancoDados;
if (window.supabase) {
    bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro: A biblioteca do Supabase não foi carregada corretamente via CDN.");
}

// ================================
// NAVEGAÇÃO (SPA)
// ================================
function mostrarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach(tela => {
        tela.style.display = 'none';
    });

    const tela = document.getElementById(nomeTela);
    if (tela) {
        tela.style.display = 'block';
    }

    // Gatilhos específicos para cada tela (evita requisições duplicadas no load)
    switch (nomeTela) {
        case 'dashboard':
            atualizarDashboard();
            break;
        case 'pacientes':
            carregarPacientes();
            break;
        case 'novoPaciente':
            // Garante que o formulário abra limpo para um novo cadastro
            const form = document.getElementById('formPaciente');
            if (form) form.reset();
            break;
        case 'configuracoes':
            carregarConfiguracoesCampos();
            break;
    }
}
window.mostrarTela = mostrarTela;

// ================================
// INICIALIZAÇÃO
// ================================
window.addEventListener('load', () => {
    aplicarConfiguracoesVisuais();
    mostrarTela('dashboard'); // O mostrarTela já vai chamar o atualizarDashboard()
});

document.addEventListener('DOMContentLoaded', () => {
    // Escuta do Menu Mobile
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            alert('Menu mobile será implementado futuramente.');
        });
    }

    // Escuta do Botão de Salvar Paciente
    const btnSalvarPaciente = document.getElementById('btnSalvarPaciente');
    if (btnSalvarPaciente) {
        btnSalvarPaciente.addEventListener('click', salvarPaciente);
    }

    // Escuta do Botão de Salvar Configurações
    const btnSalvarConfig = document.getElementById('btnSalvarConfiguracoes');
    if (btnSalvarConfig) {
        btnSalvarConfig.addEventListener('click', salvarConfiguracoes);
    }
});

// ================================
// DASHBOARD
// ================================
async function atualizarDashboard() {
    if (!bancoDados) return;
    
    try {
        const { data, error } = await bancoDados
            .from('pacientes')
            .select('status');

        if (error) throw error;

        let ativos = 0;
        let inativos = 0;

        if (data) {
            data.forEach(p => {
                if (p.status === 'Inativo') {
                    inativos++;
                } else {
                    ativos++;
                }
            });
        }

        document.getElementById('totalAtivos').innerText = ativos;
        document.getElementById('totalInativos').innerText = inativos;
        
        // Cards estáticos por enquanto (etapas futuras)
        document.getElementById('atendimentosHoje').innerText = "0";
        document.getElementById('receberMes').innerText = "R$ 0,00";

    } catch (err) {
        console.error("Erro ao atualizar Dashboard:", err);
    }
}

// ================================
// PACIENTES (LISTAGEM E BUSCA)
// ================================
async function carregarPacientes() {
    if (!bancoDados) return;

    const lista = document.getElementById('listaPacientes');
    if (!lista) return;

    lista.innerHTML = '<div class="carregando">Carregando pacientes...</div>';

    try {
        const { data, error } = await bancoDados
            .from('pacientes')
            .select('*')
            .order('nome');

        if (error) throw error;

        if (!data || data.length === 0) {
            lista.innerHTML = 'Nenhum paciente cadastrado';
            return;
        }

        let html = '';
        data.forEach(paciente => {
            html += `
                <div class="cardPaciente">
                    <strong>${paciente.nome || ''}</strong><br>
                    <small>📞 ${paciente.telefone || 'Sem telefone'}</small><br>
                    <small>🟢 Status: ${paciente.status || 'Ativo'}</small>
                </div>
            `;
        });
        lista.innerHTML = html;

    } catch (err) {
        console.error("Erro ao carregar pacientes:", err);
        lista.innerHTML = 'Erro ao carregar pacientes';
    }
}

// Filtro de pesquisa em tempo real
document.addEventListener('input', function (e) {
    if (e.target.id !== 'pesquisaPaciente') return;

    const filtro = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.cardPaciente');

    cards.forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(filtro) ? 'block' : 'none';
    });
});

// =====================================
// SALVAR PACIENTE & PLANO (TRANSACIONAL)
// =====================================
async function salvarPaciente() {
    if (!bancoDados) return;

    try {
        const nome = document.getElementById('nome').value;
        if (!nome) {
            alert('Informe o nome do paciente');
            return;
        }

        const paciente = {
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

        // Mudança crucial: tiramos o .single() para evitar quebras por políticas de banco
        const resultadoPaciente = await bancoDados
            .from('pacientes')
            .insert([paciente])
            .select('id');

        if (resultadoPaciente.error) throw resultadoPaciente.error;

        // Pegando o ID gerado (retorna como array)
        const pacienteId = resultadoPaciente.data[0].id;

        const plano = {
            paciente_id: pacienteId,
            data_inicio: document.getElementById('dataInicial').value || null,
            dia_semana: document.getElementById('diaSemana').value,
            frequencia: document.getElementById('frequencia').value,
            hora_padrao: document.getElementById('horario').value || null,
            modalidade: document.getElementById('modalidade').value,
            valor: Number(document.getElementById('valor').value || 0),
            forma_cobranca: document.getElementById('formaCobranca').value,
            ativo: true
        };

        const resultadoPlano = await bancoDados
            .from('planos_atendimento')
            .insert([plano]);

        if (resultadoPlano.error) {
            console.error(resultadoPlano.error);
            alert('Paciente salvo, mas houve um erro ao criar o plano de atendimento.');
            return;
        }

        alert('Paciente cadastrado com sucesso!');
        document.getElementById('formPaciente').reset();
        mostrarTela('pacientes');

    } catch (erro) {
        console.error("Erro geral ao salvar:", erro);
        alert('Erro ao salvar paciente. Verifique os campos ou a conexão.');
    }
}

// =====================================
// CONFIGURAÇÕES & IDENTIDADE VISUAL
// =====================================
function salvarConfiguracoes() {
    const config = {
        nomeSistema: document.getElementById('configNomeSistema').value || 'Agenda Psicóloga',
        corMenu: document.getElementById('corMenu').value,
        corPrincipal: document.getElementById('corPrincipal').value,
        corFundo: document.getElementById('corFundo').value,
        modoEscuro: document.getElementById('modoEscuro').checked
    };

    localStorage.setItem('agenda_psi_config', JSON.stringify(config));
    
    // Tratamento básico para o arquivo de imagem da logo (salva em Base64 no local)
    const logoInput = document.getElementById('configLogo');
    if (logoInput && logoInput.files && logoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            localStorage.setItem('agenda_psi_logo', e.target.result);
            aplicarConfiguracoesVisuais();
        };
        reader.readAsDataURL(logoInput.files[0]);
    } else {
        aplicarConfiguracoesVisuais();
    }

    alert('Configurações salvas com sucesso!');
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
        
        // Altera os títulos dinamicamente
        document.getElementById('nomeSistema').innerText = config.nomeSistema;
        document.getElementById('tituloSistema').innerText = config.nomeSistema;
        document.title = config.nomeSistema;

        // Aplica as variáveis de cores para o CSS usar (se seu style.css usar variáveis)
        document.documentElement.style.setProperty('--cor-menu', config.corMenu);
        document.documentElement.style.setProperty('--cor-principal', config.corPrincipal);
        document.documentElement.style.setProperty('--cor-fundo', config.corFundo);

        // Fallback direto caso não use variáveis CSS no arquivo style.css:
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.backgroundColor = config.corMenu;
        
        if (config.modoEscuro) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // Aplica a logo se existir
    const imgLogo = document.getElementById('logoSistema');
    if (imgLogo && logoSalva) {
        imgLogo.src = logoSalva;
        imgLogo.style.display = 'block';
    }
}

console.log('APP V2.1 OTIMIZADO E CONECTADO');
