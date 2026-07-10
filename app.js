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
