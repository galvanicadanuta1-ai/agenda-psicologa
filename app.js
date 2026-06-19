// ==========================================================================
// CONFIGURAÇÕES DE CONEXÃO DO SUPABASE
// ==========================================================================
const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2JrY2xvZnNucm9wc3NyYWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODg3NjcsImV4cCI6MjA5Njc2NDc2N30._8_tmYoRlyEhARjXZ3swW8ynCPY5aysGMFCTzgcnK5Y';

// Inicialização segura do cliente Supabase
let bancoDados;
if (window.supabase) {
    bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Erro critical: A biblioteca do Supabase não foi carregada via CDN no HTML.");
}

// ==========================================================================
// NAVEGAÇÃO INTERNA (SPA)
// ==========================================================================
function mostrarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach(tela => {
        tela.style.display = 'none';
    });

    const tela = document.getElementById(nomeTela);
    if (tela) {
        tela.style.display = 'block';
    }

    // Gatilhos específicos ao abrir cada tela (evita requisições duplicadas)
    switch (nomeTela) {
        case 'dashboard':
            atualizarDashboard();
            break;
        case 'pacientes':
            carregarPacientes();
            break;
        case 'novoPaciente':
            const form = document.getElementById('formPaciente');
            if (form) form.reset();
            break;
        case 'configuracoes':
            carregarConfiguracoesCampos();
            break;
    }
}
window.mostrarTela = mostrarTela;

// ==========================================================================
// INICIALIZAÇÃO E ESCUTAS DE EVENTOS
// ==========================================================================
window.addEventListener('load', () => {
    aplicarConfiguracoesVisuais();
    mostrarTela('dashboard'); // Já engaja o atualizarDashboard internamente
});

document.addEventListener('DOMContentLoaded', () => {
    // Menu Mobile
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            alert('Menu mobile será implementado futuramente.');
        });
    }

    // Botão Salvar Paciente
    const btnSalvarPaciente = document.getElementById('btnSalvarPaciente');
    if (btnSalvarPaciente) {
        btnSalvarPaciente.addEventListener('click', salvarPaciente);
    }

    // Botão Salvar Configurações
    const btnSalvarConfig = document.getElementById('btnSalvarConfiguracoes');
    if (btnSalvarConfig) {
        btnSalvarConfig.addEventListener('click', salvarConfiguracoes);
    }

    // Automação: Escuta alteração na data para mudar o dia da semana sozinho
    const dataInicialInput = document.getElementById('dataInicial');
    if (dataInicialInput) {
        dataInicialInput.addEventListener('change', atualizarDiaSemanaAutomatico);
    }
});

// ==========================================================================
// AUTOMATIZAÇÃO: CALCULAR DIA DA SEMANA
// ==========================================================================
function atualizarDiaSemanaAutomatico() {
    const dataValor = document.getElementById('dataInicial').value;
    if (!dataValor) return;

    // Isola as partes da data para evitar distorção de fuso horário (UTC)
    const partes = dataValor.split('-');
    const dataObjeto = new Date(partes[0], partes[1] - 1, partes[2]);

    const diasDaSemana = [
        'Domingo',
        'Segunda',
        'Terça',
        'Quarta',
        'Quinta',
        'Sexta',
        'Sábado'
    ];

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
// DASHBOARD
// ==========================================================================
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
        
        // Contadores estáticos para implementações futuras da agenda
        document.getElementById('atendimentosHoje').innerText = "0";
        document.getElementById('receberMes').innerText = "R$ 0,00";

    } catch (err) {
        console.error("Erro ao atualizar dados do Dashboard:", err);
    }
}

// ==========================================================================
// PACIENTES (LISTAGEM E FILTRO)
// ==========================================================================
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
                    <small>📞 Telefone: ${paciente.telefone || 'Não informado'}</small><br>
                    <small>🟢 Status: ${paciente.status || 'Ativo'}</small>
                </div>
            `;
        });
        lista.innerHTML = html;

    } catch (err) {
        console.error("Erro ao carregar lista de pacientes:", err);
        lista.innerHTML = 'Erro ao carregar pacientes';
    }
}

// Mecanismo de busca em tempo real (Filtro cliente)
document.addEventListener('input', function (e) {
    if (e.target.id !== 'pesquisaPaciente') return;

    const filtro = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.cardPaciente');

    cards.forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(filtro) ? 'block' : 'none';
    });
});

// ==========================================================================
// FLUXO: SALVAR PACIENTE E PLANO ATENDIMENTO
// ==========================================================================
async function salvarPaciente() {
    if (!bancoDados) return;

    try {
        const nome = document.getElementById('nome').value;
        if (!nome) {
            alert('Informe o nome do paciente');
            return;
        }

        // Montagem do payload de Pacientes
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

        // Salvando paciente (Removido .single() para evitar travas de segurança)
        const resultadoPaciente = await bancoDados
            .from('pacientes')
            .insert([paciente])
            .select('id');

        if (resultadoPaciente.error) throw resultadoPaciente.error;

        // Recupera o ID gerado pelo banco para vincular ao plano
        const pacienteId = resultadoPaciente.data[0].id;

        // Montagem do payload de Planos
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
            alert('Paciente salvo, mas ocorreu um erro crítico ao gerar o plano de atendimento.');
            return;
        }

        alert('Paciente e plano cadastrados com sucesso!');
        document.getElementById('formPaciente').reset();
        mostrarTela('pacientes');

    } catch (erro) {
        console.error("Erro na transação de salvamento:", erro);
        alert('Erro ao salvar paciente. Verifique os campos ou certifique-se de que o RLS está desativado no Supabase.');
    }
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
    
    // Processamento da logo para armazenamento local em Base64
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

    alert('Configurações aplicadas com sucesso!');
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

        // Injeta propriedades customizadas no root (CSS moderno)
        document.documentElement.style.setProperty('--cor-menu', config.corMenu);
        document.documentElement.style.setProperty('--cor-principal', config.corPrincipal);
        document.documentElement.style.setProperty('--cor-fundo', config.corFundo);

        // Fallback direto para o layout antigo
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.backgroundColor = config.corMenu;
        
        if (config.modoEscuro) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    const imgLogo = document.getElementById('logoSistema');
    if (imgLogo && logoSalva) {
        imgLogo.src = logoSalva;
        imgLogo.style.display = 'block';
    }
}

console.log('APP V2.5 INTEGRADO E PRONTO');
