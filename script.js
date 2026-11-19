
// ======================================
// ARRUDA BARBER - AGENDAMENTO
// ======================================

// WHATSAPP DOS PROFISSIONAIS
const profissionais = {
  "Arruda": "55992294941",
  "Felipe": "55991274993",
  "Thalita": "55991692449"
};

// DURAÇÃO DOS SERVIÇOS
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

// HORÁRIO DE FUNCIONAMENTO
const ABERTURA = 9;
const FECHAMENTO = 19;
const INTERVALO = 15;

// CAMPOS DO FORMULÁRIO
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
  campoHorario.innerHTML =
    '<option value="">Escolha um horário</option>';

  const dataEscolhida = campoData.value;
  const servicoEscolhido = campoServico.value;
  const profissionalEscolhido = campoProfissional.value;

  if (!dataEscolhida || !servicoEscolhido || !profissionalEscolhido) {
    return;
  }

  const data = new Date(dataEscolhida + "T12:00:00");
  const diaSemana = data.getDay();

  // DOMINGO E SEGUNDA: FECHADO
  if (diaSemana === 0 || diaSemana === 1) {
    campoHorario.innerHTML =
      '<option value="">Fechado. Atendemos de terça a sábado.</option>';
    return;
  }

  // ARRUDA NÃO ATENDE QUARTA-FEIRA
  if (profissionalEscolhido === "Arruda" && diaSemana === 3) {
    campoHorario.innerHTML =
      '<option value="">Arruda não atende às quartas-feiras</option>';
    return;
  }

  const duracao = servicos[servicoEscolhido];

  if (!duracao) return;

  const agora = new Date();
  const ehHoje = dataEscolhida === dataLocal(agora);

  for (
    let minutos = ABERTURA * 60;
    minutos + duracao <= FECHAMENTO * 60;
    minutos += INTERVALO
  ) {
    if (ehHoje) {
      const minutosAtuais =
        agora.getHours() * 60 + agora.getMinutes();

      if (minutos <= minutosAtuais) continue;
    }

    const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
    const minuto = String(minutos % 60).padStart(2, "0");
    const horario = `${hora}:${minuto}`;

    campoHorario.add(new Option(horario, horario));
  }

  if (campoHorario.options.length === 1) {
    campoHorario.innerHTML =
      '<option value="">Não há horários disponíveis</option>';
  }
}

// ATUALIZAR QUANDO O CLIENTE ESCOLHER
campoData.addEventListener("change", atualizarHorarios);
campoServico.addEventListener("change", atualizarHorarios);
campoProfissional.addEventListener("change", atualizarHorarios);

// CONFIRMAR AGENDAMENTO
formulario.addEventListener("submit", function(event) {
  event.preventDefault();

  const nome = campoNome.value.trim();
  const servico = campoServico.value;
  const profissional = campoProfissional.value;
  const data = campoData.value;
  const horario = campoHorario.value;

  if (!nome || !servico || !profissional || !data || !horario) {
    alert("Preencha todos os campos do agendamento.");
    return;
  }

  const telefone = profissionais[profissional];

  if (!telefone) {
    alert("Não encontramos o WhatsApp deste profissional.");
    return;
  }

  const dataObj = new Date(data + "T12:00:00");
  const diaSemana = dataObj.getDay();

  if (diaSemana === 0 || diaSemana === 1) {
    alert("A barbearia não atende aos domingos e segundas.");
    return;
  }

  if (profissional === "Arruda" && diaSemana === 3) {
    alert("Arruda não atende às quartas-feiras.");
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
    "https://wa.me/" + telefone +
    "?text=" + encodeURIComponent(mensagem);

  window.location.href = link;
});

console.log("Arruda Barber carregada com sucesso!");
