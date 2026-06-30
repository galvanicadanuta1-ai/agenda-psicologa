// CONTROLADOR DE NAVEGAÇÃO DE ABAS
function alternarTela(telaAlvo) {
    const telaAgenda = document.getElementById('tela-agenda-semanal');
    const telaProntuario = document.getElementById('tela-prontuario-paciente');
    const btnAgenda = document.getElementById('nav-agenda');
    const btnProntuario = document.getElementById('nav-prontuario');

    if (telaAlvo === 'agenda') {
        telaAgenda.style.display = 'block';
        telaProntuario.style.display = 'none';
        btnAgenda.classList.add('active');
        btnProntuario.classList.remove('active');
    } else {
        telaAgenda.style.display = 'none';
        telaProntuario.style.display = 'flex';
        btnAgenda.classList.remove('active');
        btnProntuario.classList.add('active');
        atualizarSimulacaoAgenda();
    }
}

// SIMULAÇÃO DA SIDEBAR DO PACIENTE
function atualizarSimulacaoAgenda() {
    const resumoBox = document.getElementById('info-plano-resumo');
    const listaScroll = document.getElementById('lista-proximas-sessoes');
    
    if (!resumoBox || !listaScroll) return;

    const frequencia = document.getElementById('frequencia').value;
    const horaPadrao = document.getElementById('horario').value;
    const modalidade = document.getElementById('modalidade').value;
    const valor = Number(document.getElementById('valor').value).toFixed(2);

    resumoBox.innerHTML = `
        Frequência: <b>${frequencia}</b><br>
        Horário Fixo: <b>${horaPadrao}</b><br>
        Modalidade: <b>${modalidade}</b><br>
        Valor: <b>R$ ${valor}</b>
    `;

    // Gera 3 sessões fictícias apenas para preencher visualmente a barra lateral
    listaScroll.innerHTML = `
        <div class="container-linha-bloco">
            <strong>📅 02/07/2026 às ${horaPadrao} - ${modalidade}</strong>
            <span>Status: <b>Agendado</b> | R$ ${valor}</span>
        </div>
        <div class="container-linha-bloco">
            <strong>📅 09/07/2026 às ${horaPadrao} - ${modalidade}</strong>
            <span>Status: <b>Agendado</b> | R$ ${valor}</span>
        </div>
    `;
}
