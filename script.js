
// ======================================
// ARRUDA BARBER - SISTEMA DE AGENDAMENTO
// ======================================

// WHATSAPP DOS PROFISSIONAIS
// Preencher os números de Arruda e Felipe depois.
const profissionais = {
  "Arruda": "55992294941",
  "Felipe": "55991274993",
  "Thalita": "55991692449"
};

// DURAÇÃO DOS SERVIÇOS EM MINUTOS
const servicos = {
  "Cabelo": 35,
  "Cabelo e barba": 55,
  "Barba": 25,
  "Sobrancelha com corte": 5,
  "Apenas sobrancelha": 10,
  "Pezinhos": 15,
  "1 pente e pezinho": 20,
  "2 pentes e pezinho": 25
};

// FUNCIONAMENTO
const HORA_ABERTURA = 9;
const HORA_FECHAMENTO = 19; // Horário provisório
const INTERVALO = 15;

// ELEMENTOS DA PÁGINA
const formulario = document.getElementById("formAgendamento");
const campoNome = document.getElementById("nome");
const campoServico = document.getElementById("servico");
const campoProfissional = document.getElementById("profissional");
const campoData = document.getElementById("data");
const campoHorario = document.getElementById("horario");

// DATA LOCAL
function dataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// IMPEDIR DATAS PASSADAS
campoData.min = dataLocal(new Date());

// ATUALIZAR HORÁRIOS
function atualizarHorarios() {
  campoHorario.innerHTML = "";

  const dataSelecionada = campoData.value;
  const servicoSelecionado = campoServico.value;

  if (!dataSelecionada || !servicoSelecionado) {
    campoHorario.innerHTML =
      '<option value="">Escolha a data e o serviço</option>';
    return;
  }

  const data = new Date(dataSelecionada + "T12:00:00");
  const diaSemana = data.getDay();

  // DOMINGO E SEGUNDA: FECHADO
  if (diaSemana === 0 || diaSemana === 1) {
    campoHorario.innerHTML =
      '<option value="">Fechado. Atendemos de terça a sábado.</option>';
    return;
  }

  const duracao = servicos[servicoSelecionado];
  const hoje = new Date();
  const ehHoje = dataSelecionada === dataLocal(hoje);

  let quantidade = 0;

  for (
    let minutos = HORA_ABERTURA * 60;
    minutos + duracao <= HORA_FECHAMENTO * 60;
    minutos += INTERVALO
  ) {
    // Não oferecer horários que já passaram hoje.
    if (ehHoje) {
      const minutosAtuais =
        hoje.getHours() * 60 + hoje.getMinutes();

      if (minutos <= minutosAtuais) {
        continue;
      }
    }

    const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
    const minuto = String(minutos % 60).padStart(2, "0");

    const horario = `${hora}:${minuto}`;

    campoHorario.add(new Option(horario, horario));
    quantidade++;
  }

  if (quantidade === 0) {
    campoHorario.innerHTML =
      '<option value="">Não existem horários disponíveis</option>';
  }
}

// ESCUTAR ALTERAÇÕES
campoData.addEventListener("change", atualizarHorarios);
campoServico.addEventListener("change", atualizarHorarios);

// ENVIAR AGENDAMENTO PARA O WHATSAPP
formulario.addEventListener("submit", function(event) {
  event.preventDefault();

  const nome = campoNome.value.trim();
  const servico = campoServico.value;
  const profissional = campoProfissional.value;
  const data = campoData.value;
  const horario = campoHorario.value;

  if (!nome || !servico || !profissional || !data || !horario) {
    alert("Preencha todos os campos!");
    return;
  }

  const telefone = telefones[profissional];

  if (!telefone) {
    alert(
      "O WhatsApp de " + profissional +
      " ainda precisa ser configurado."
    );
    return;
  }

  const partes = data.split("-");
  const dataFormatada =
    `${partes[2]}/${partes[1]}/${partes[0]}`;

  const mensagem =
    `Olá, ${profissional}! Gostaria de agendar na Arruda Barber.\n\n` +
    `Nome: ${nome}\n` +
    `Serviço: ${servico}\n` +
    `Profissional: ${profissional}\n` +
    `Data: ${dataFormatada}\n` +
    `Horário: ${horario}\n\n` +
    `Aguardo a confirmação do meu horário!`;

  const link =
    "https://wa.me/" +
    telefone +
    "?text=" +
    encodeURIComponent(mensagem);

  window.location.href = link;
});

console.log("Arruda Barber carregada com sucesso!");
