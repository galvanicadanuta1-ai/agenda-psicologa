const SUPABASE_URL = 'https://sasbkclofsnropssrafn.supabase.co';

const SUPABASE_KEY = 'sb_publishable_GEjXlZTuzGDooj56xp9oWg_4cgxRK_C';

const bancoDados = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================================

// NAVEGAÇÃO

// ================================

function mostrarTela(nomeTela) {

document.querySelectorAll('.tela').forEach(tela => {

tela.style.display = 'none';

});

const tela = document.getElementById(nomeTela);

if (tela) {

tela.style.display = 'block';

}

if (nomeTela === 'pacientes') {

carregarPacientes();

}

if (nomeTela === 'dashboard') {

atualizarDashboard();

}

}

window.mostrarTela = mostrarTela;

// ================================

// INICIALIZAÇÃO

// ================================

window.addEventListener('load', async () => {

mostrarTela('dashboard');

await atualizarDashboard();

});

// ================================

// DASHBOARD

// ================================

async function atualizarDashboard() {

try {

const { data, error } = await bancoDados

.from('pacientes')

.select('status');

if (error) {

console.error(error);

return;

}

let ativos = 0;

let inativos = 0;

data.forEach(p => {

if (p.status === 'Inativo') {

inativos++;

} else {

ativos++;

}

});

document.getElementById('totalAtivos').innerText = ativos;

document.getElementById('totalInativos').innerText = inativos;

} catch (err) {

console.error(err);

}

}

// ================================

// PACIENTES

// ================================

async function carregarPacientes() {

const lista = document.getElementById('listaPacientes');

if (!lista) return;

lista.innerHTML = 'Carregando pacientes...';

try {

const { data, error } = await bancoDados

.from('pacientes')

.select('*')

.order('nome');

if (error) {

console.error(error);

lista.innerHTML = 'Erro ao carregar pacientes';

return;

}

if (!data || data.length === 0) {

lista.innerHTML = 'Nenhum paciente cadastrado';

return;

}

let html = '';

data.forEach(paciente => {

html += `

<div class="cardPaciente">

<strong>${paciente.nome || ''}</strong><br>

<small>${paciente.telefone || ''}</small><br>

<small>${paciente.status || 'Ativo'}</small>

</div>

`;

});

lista.innerHTML = html;

} catch (err) {

console.error(err);

lista.innerHTML = 'Erro ao carregar pacientes';

}

}

// ================================

// PESQUISA

// ================================

document.addEventListener('input', function (e) {

if (e.target.id !== 'pesquisaPaciente') return;

const filtro = e.target.value.toLowerCase();

const cards = document.querySelectorAll('.cardPaciente');

cards.forEach(card => {

const texto = card.innerText.toLowerCase();

card.style.display = texto.includes(filtro) ? 'block' : 'none';

});

});

// ================================

// MENU MOBILE

// ================================

document.addEventListener('DOMContentLoaded', () => {

const menuBtn = document.getElementById('menuBtn');

if (menuBtn) {

menuBtn.addEventListener('click', () => {

alert('Menu mobile será implementado futuramente.');

});

}

});

console.log('APP V2 CARREGADO');
// =====================================
// SALVAR PACIENTE
// =====================================

const btnSalvarPaciente =
document.getElementById(
'btnSalvarPaciente'
);

if(btnSalvarPaciente){

btnSalvarPaciente.addEventListener(
'click',
salvarPaciente
);

}

async function salvarPaciente(){

try{

const nome =
document.getElementById('nome').value;

if(!nome){

alert('Informe o nome do paciente');
return;

}

const paciente = {

nome: nome,
cpf: document.getElementById('cpf').value,
telefone: document.getElementById('telefone').value,
email: document.getElementById('email').value,
data_nascimento: document.getElementById('dataNascimento').value || null,
endereco: document.getElementById('endereco').value,
responsavel: document.getElementById('responsavel').value,
observacoes: document.getElementById('observacoes').value,
status: document.getElementById('statusPaciente').value,
ativo: document.getElementById('statusPaciente').value === 'Ativo'

};

const resultadoPaciente =
await bancoDados
.from('pacientes')
.insert([paciente])
.select()
.single();

if(resultadoPaciente.error){

console.error(resultadoPaciente.error);
alert('Erro ao salvar paciente');
return;

}

const pacienteId =
resultadoPaciente.data.id;

const plano = {

paciente_id: pacienteId,
data_inicio: document.getElementById('dataInicial').value || null,
dia_semana: document.getElementById('diaSemana').value,
frequencia: document.getElementById('frequencia').value,
hora_padrao: document.getElementById('horario').value,
modalidade: document.getElementById('modalidade').value,
valor: Number(document.getElementById('valor').value || 0),
forma_cobranca: document.getElementById('formaCobranca').value,
ativo: true

};

const resultadoPlano =
await bancoDados
.from('planos_atendimento')
.insert([plano]);

if(resultadoPlano.error){

console.error(resultadoPlano.error);
alert('Paciente salvo, mas houve erro ao criar plano.');
return;

}

alert('Paciente cadastrado com sucesso!');

document.getElementById(
'formPaciente'
).reset();

mostrarTela(
'pacientes'
);

}
catch(erro){

console.error(erro);

alert(
'Erro ao salvar paciente'
);

}

}
