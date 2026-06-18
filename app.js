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
document
.querySelectorAll('.tela')
.forEach(tela=>{
    tela.style.display='none';
});

const tela =
document.getElementById(
nomeTela
);

if(tela){
    tela.style.display='block';
}

if(nomeTela==='pacientes'){
    carregarPacientes();
}

if(nomeTela==='dashboard'){
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
        p.status ===
        'Inativo'
        ){

            inativos++;

        }else{

            ativos++;

        }

    });

    const totalAtivos =
    document.getElementById(
    'totalAtivos'
    );

    const totalInativos =
    document.getElementById(
    'totalInativos'
    );

    if(totalAtivos){
        totalAtivos.innerText =
        ativos;
    }

    if(totalInativos){
        totalInativos.innerText =
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
    .order(
    'nome'
    );

    if(error){

        console.error(error);

        lista.innerHTML =
        'Erro ao carregar pacientes';

        return;

    }

    if(
    !data ||
    data.length===0
    ){

        lista.innerHTML =
        'Nenhum paciente cadastrado';

        return;

    }

    let html='';

    data.forEach(
    paciente=>{

        html += `

        <div class="cardPaciente">

            <strong>
            ${paciente.nome || ''}
            </strong>

            <br>

            <small>
            ${paciente.telefone || ''}
            </small>

            <br>

            <small>
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
// PESQUISA
// =====================================

document.addEventListener(
'input',
function(e){

```
if(
e.target.id !==
'pesquisaPaciente'
) return;

const filtro =
e.target.value
.toLowerCase();

const cards =
document.querySelectorAll(
'.cardPaciente'
);

cards.forEach(card=>{

    const texto =
    card.innerText
    .toLowerCase();

    card.style.display =
    texto.includes(filtro)
    ? 'block'
    : 'none';

});
```

}
);

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

console.log(
'APP V1 CARREGADO'
);
