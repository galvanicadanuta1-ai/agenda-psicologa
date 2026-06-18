const SUPABASE_URL =
'https://sasbkclofsnropssrafn.supabase.co';

const SUPABASE_KEY =
'sb_publishable_GEjXlZTuzGDooj56xp9oWg_4cgxRK_C';

const bancoDados =
window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

// =====================================
// NAVEGAÇÃO
// =====================================

function mostrarTela(nomeTela){

```
const telas =
document.querySelectorAll('.tela');

telas.forEach(tela=>{
    tela.style.display='none';
});

const tela =
document.getElementById(nomeTela);

if(tela){
    tela.style.display='block';
}

if(nomeTela === 'pacientes'){
    carregarPacientes();
}

if(nomeTela === 'dashboard'){
    atualizarDashboard();
}
```

}

window.mostrarTela =
mostrarTela;

// =====================================
// INICIALIZAÇÃO
// =====================================

window.addEventListener(
'load',
async ()=>{

```
mostrarTela(
'dashboard'
);

await atualizarDashboard();
```

}
);

// =====================================
// DASHBOARD
// =====================================

async function atualizarDashboard(){

```
try{

    const {
        data,
        error
    } =
    await bancoDados
    .from('pacientes')
    .select('status');

    if(error){

        console.error(error);
        return;

    }

    let ativos = 0;
    let inativos = 0;

    data.forEach(p=>{

        if(
        p.status === 'Inativo'
        ){

            inativos++;

        }else{

            ativos++;

        }

    });

    const campoAtivos =
    document.getElementById(
    'totalAtivos'
    );

    const campoInativos =
    document.getElementById(
    'totalInativos'
    );

    if(campoAtivos){
        campoAtivos.innerText =
        ativos;
    }

    if(campoInativos){
        campoInativos.innerText =
        inativos;
    }

}
catch(err){

    console.error(err);

}
```

}

// =====================================
// PACIENTES
// =====================================

async function carregarPacientes(){

```
const lista =
document.getElementById(
'listaPacientes'
);

if(!lista) return;

lista.innerHTML =
'Carregando pacientes...';

try{

    const {
        data,
        error
    } =
    await bancoDados
    .from('pacientes')
    .select('*')
    .order('nome');

    if(error){

        console.error(error);

        lista.innerHTML =
        'Erro ao carregar pacientes';

        return;

    }

    if(
    !data ||
    data.length === 0
    ){

        lista.innerHTML =
        'Nenhum paciente encontrado';

        return;

    }

    let html = '';

    data.forEach(
    paciente=>{

        html += `

        <div
        class="cardPaciente"
        data-id="${paciente.id}"
        >

            <strong>
            ${paciente.nome || ''}
            </strong>

            <br>

            <small>
            ${paciente.telefone || ''}
            </small>

            <br>

            <small>
            Status:
            ${paciente.status || 'Ativo'}
            </small>

        </div>

        `;

    });

    lista.innerHTML =
    html;

}
catch(err){

    console.error(err);

    lista.innerHTML =
    'Erro ao carregar pacientes';

}
```

}
// =====================================
// GERAR AGENDAMENTOS FUTUROS
// =====================================

function gerarDatasAtendimento(
dataInicial,
frequencia
){

```
const datas = [];

const inicio =
new Date(dataInicial);

let intervalo = 7;

if(
frequencia ===
'Quinzenal'
){
    intervalo = 14;
}

if(
frequencia ===
'Mensal'
){
    intervalo = 30;
}

for(
let i=0;
i<26;
i++
){

    const data =
    new Date(inicio);

    data.setDate(
    inicio.getDate() +
    (intervalo * i)
    );

    datas.push(

    data
    .toISOString()
    .split('T')[0]

    );

}

return datas;
```

}

// =====================================
// SALVAR PACIENTE
// =====================================

async function salvarPaciente(){

```
try{

    const nome =
    document
    .getElementById(
    'nome'
    ).value;

    if(!nome){

        alert(
        'Informe o nome do paciente.'
        );

        return;

    }

    const cpf =
    document
    .getElementById(
    'cpf'
    ).value;

    const dataNascimento =
    document
    .getElementById(
    'dataNascimento'
    ).value;

    const telefone =
    document
    .getElementById(
    'telefone'
    ).value;

    const email =
    document
    .getElementById(
    'email'
    ).value;

    const endereco =
    document
    .getElementById(
    'endereco'
    ).value;

    const responsavel =
    document
    .getElementById(
    'responsavel'
    ).value;

    const observacoes =
    document
    .getElementById(
    'observacoes'
    ).value;

    const status =
    document
    .getElementById(
    'statusPaciente'
    ).value;

    const dataInicial =
    document
    .getElementById(
    'dataInicial'
    ).value;

    const diaSemana =
    document
    .getElementById(
    'diaSemana'
    ).value;

    const frequencia =
    document
    .getElementById(
    'frequencia'
    ).value;

    const horario =
    document
    .getElementById(
    'horario'
    ).value;

    const modalidade =
    document
    .getElementById(
    'modalidade'
    ).value;

    const valor =
    Number(
    document
    .getElementById(
    'valor'
    ).value || 0
    );

    const formaCobranca =
    document
    .getElementById(
    'formaCobranca'
    ).value;

    const {
        data: pacienteCriado,
        error: erroPaciente
    }
    =
    await bancoDados
    .from('pacientes')
    .insert([{

        nome,
        cpf,
        data_nascimento:
        dataNascimento || null,

        telefone,
        email,
        endereco,
        responsavel,
        observacoes,
        status

    }])
    .select()
    .single();

    if(erroPaciente){

        console.error(
        erroPaciente
        );

        alert(
        'Erro ao salvar paciente.'
        );

        return;

    }

    const pacienteId =
    pacienteCriado.id;
```
```
    // =====================================
    // SALVA PLANO DE ATENDIMENTO
    // =====================================

    const {
        error: erroPlano
    }
    =
    await bancoDados
    .from('planos_atendimento')
    .insert([{

        paciente_id:
        pacienteId,

        data_inicio:
        dataInicial || null,

        frequencia:
        frequencia,

        hora_padrao:
        horario || null,

        modalidade:
        modalidade,

        dia_semana:
        diaSemana,

        valor:
        valor,

        forma_cobranca:
        formaCobranca,

        ativo:
        true

    }]);

    if(erroPlano){

        console.error(
        erroPlano
        );

        alert(
        'Paciente salvo, porém houve erro ao salvar o plano.'
        );

        return;

    }

    // =====================================
    // GERA AGENDAMENTOS FUTUROS
    // =====================================

    if(dataInicial){

        const datas =
        gerarDatasAtendimento(
            dataInicial,
            frequencia
        );

        const agendamentos =
        datas.map(data=>({

            paciente_id:
            pacienteId,

            data:
            data,

            hora:
            horario,

            modalidade:
            modalidade,

            status:
            'Agendado',

            valor:
            valor,

            pago:
            false,

            observacao:
            null

        }));

        const {
            error: erroAgenda
        }
        =
        await bancoDados
        .from('agendamentos')
        .insert(
        agendamentos
        );

        if(erroAgenda){

            console.error(
            erroAgenda
            );

        }

    }

    alert(
    'Paciente cadastrado com sucesso.'
    );

    document
    .getElementById(
    'formPaciente'
    )
    .reset();

    await carregarPacientes();

    await atualizarDashboard();

    mostrarTela(
    'pacientes'
    );

}
catch(err){

    console.error(err);

    alert(
    'Erro inesperado ao salvar paciente.'
    );

}
```

}
// =====================================
// BOTÃO SALVAR
// =====================================

document.addEventListener(
'DOMContentLoaded',
()=>{

```
const btnSalvar =
document.getElementById(
'btnSalvarPaciente'
);

if(btnSalvar){

    btnSalvar.addEventListener(
    'click',
    salvarPaciente
    );

}

const pesquisa =
document.getElementById(
'pesquisaPaciente'
);

if(pesquisa){

    pesquisa.addEventListener(
    'input',
    function(){

        const filtro =
        this.value
        .toLowerCase();

        const cards =
        document
        .querySelectorAll(
        '.cardPaciente'
        );

        cards.forEach(card=>{

            const texto =
            card.innerText
            .toLowerCase();

            if(
            texto.includes(
            filtro
            )
            ){

                card.style.display =
                'block';

            }else{

                card.style.display =
                'none';

            }

        });

    }
    );

}
```

});

// =====================================
// MENU MOBILE
// =====================================

const menuBtn =
document.getElementById(
'menuBtn'
);

if(menuBtn){

```
menuBtn.addEventListener(
'click',
()=>{

    alert(
    'Menu mobile será implementado futuramente.'
    );

}
);
```

}

// =====================================
// CONFIGURAÇÕES
// =====================================

async function salvarConfiguracoes(){

```
alert(
'Configurações serão ativadas na próxima versão.'
);
```

}

// =====================================
// FIM APP.JS V2
// =====================================
