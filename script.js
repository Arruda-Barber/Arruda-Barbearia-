
const SUPABASE_URL = "https://kduaktloheptwyzynppf.supabase.co";
const SUPABASE_KEY = "sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const profissionais = {
  Arruda: "5555992294941",
  Felipe: "5555991274993",
  Thalita: "5555991692449"
};

const servicos = {
  "Corte degradê": { preco: 35, minutos: 30 },
  "Corte degradê (navalhado)": { preco: 40, minutos: 35 },
  "Corte social": { preco: 35, minutos: 30 },
  "Cabelo e barba": { preco: 55, minutos: 50 },
  "Cabelo, barba e sobrancelha": { preco: 60, minutos: 55 },
  "Corte 2 pentes": { preco: 25, minutos: 20 },
  "Corte 1 pente": { preco: 20, minutos: 15 },
  "Pezinhos": { preco: 15, minutos: 10 },
  "Sobrancelha": { preco: 5, minutos: 10 },
  "Barba": { preco: 25, minutos: 20 }
};

const formulario = document.getElementById("formAgendamento");
const campoNome = document.getElementById("nome");
const campoTelefone = document.getElementById("telefone");
const campoServico = document.getElementById("servico");
const campoProfissional = document.getElementById("profissional");
const campoData = document.getElementById("data");
const campoHorario = document.getElementById("horario");

if (!formulario || !campoNome || !campoServico ||
    !campoProfissional || !campoData || !campoHorario) {
  console.error("Não foi possível localizar todos os campos do formulário.");
  alert("Erro ao carregar o formulário. Atualize a página.");
  throw new Error("Campos do formulário não encontrados.");
}

const botao = formulario.querySelector('button[type="submit"]');

function dataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function minutosHora(hora) {
  const partes = hora.split(":");
  return Number(partes[0]) * 60 + Number(partes[1]);
}

function formatarHora(minutos) {
  const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
  const minuto = String(minutos % 60).padStart(2, "0");
  return `${hora}:${minuto}:00`;
}

campoData.min = dataLocal(new Date());

function diaPermitido(data, profissional) {
  const dia = new Date(data + "T12:00:00").getDay();

  if (dia === 0 || dia === 1) return false;
  if (profissional === "Arruda" && dia === 3) return false;

  return true;
}

async function atualizarHorarios() {
  campoHorario.innerHTML =
    '<option value="">Carregando horários...</option>';

  const data = campoData.value;
  const servico = campoServico.value;
  const profissional = campoProfissional.value;

  if (!data || !servico || !profissional) {
    campoHorario.innerHTML =
      '<option value="">Escolha data, serviço e profissional</option>';
    return;
  }

  if (!diaPermitido(data, profissional)) {
    campoHorario.innerHTML =
      '<option value="">Profissional não atende neste dia</option>';
    return;
  }

  const { data: ocupados, error } = await db.rpc(
    "get_busy_intervals_v2",
    {
      p_date: data,
      p_barber: profissional
    }
  );

  if (error) {
    console.error("Erro ao consultar agenda:", error);
    alert("Erro ao consultar agenda: " + error.message);
    campoHorario.innerHTML =
      '<option value="">Erro ao consultar agenda</option>';
    return;
  }

  const duracao = servicos[servico].minutos;
  const agora = new Date();
  const hoje = dataLocal(agora);
  const minutoAtual = agora.getHours() * 60 + agora.getMinutes();
  const horarios = [];

  function adicionarPeriodo(inicio, fim) {
    for (
      let minuto = inicio;
      minuto + duracao <= fim;
      minuto += 15
    ) {
      if (
        data < hoje ||
        (data === hoje && minuto <= minutoAtual)
      ) {
        continue;
      }

      const fimSlot = minuto + duracao;

      const conflito = (ocupados || []).some(item => {
        const inicioOcupado = minutosHora(item.start_time);
        const fimOcupado = minutosHora(item.end_time);

        return minuto < fimOcupado && fimSlot > inicioOcupado;
      });

      if (!conflito) {
        horarios.push(formatarHora(minuto).slice(0, 5));
      }
    }
  }

  const dia = new Date(data + "T12:00:00").getDay();

  adicionarPeriodo(9 * 60, 12 * 60);

  if (dia === 6) {
    adicionarPeriodo(14 * 60, 19 * 60);
  } else {
    adicionarPeriodo(14 * 60, 19 * 60 + 30);
  }

  campoHorario.innerHTML =
    '<option value="">Escolha um horário</option>';

  horarios.forEach(horario => {
    campoHorario.add(new Option(horario, horario));
  });

  if (!horarios.length) {
    campoHorario.innerHTML =
      '<option value="">Não há horários disponíveis</option>';
  }
}

campoData.addEventListener("change", function() {
  if (
    campoData.value &&
    !diaPermitido(campoData.value, campoProfissional.value)
  ) {
    alert("Esse profissional não atende nesta data. Escolha outro dia.");
    campoData.value = "";
    campoHorario.innerHTML =
      '<option value="">Escolha outra data</option>';
    return;
  }

  atualizarHorarios();
});

campoServico.addEventListener("change", atualizarHorarios);

campoProfissional.addEventListener("change", function() {
  if (
    campoData.value &&
    !diaPermitido(campoData.value, campoProfissional.value)
  ) {
    alert("Arruda não atende às quartas-feiras. Escolha outro dia.");
    campoData.value = "";
  }

  atualizarHorarios();
});

formulario.addEventListener("submit", async function(event) {
  event.preventDefault();

  const nome = campoNome.value.trim();
  const telefoneCliente = campoTelefone
    ? campoTelefone.value.trim()
    : "";
  const servico = campoServico.value;
  const profissional = campoProfissional.value;
  const data = campoData.value;
  const horario = campoHorario.value;

  if (!nome || !servico || !profissional || !data || !horario) {
    alert("Preencha todos os campos.");
    return;
  }

  if (!servicos[servico]) {
    alert("Serviço inválido.");
    return;
  }

  if (!diaPermitido(data, profissional)) {
    alert("Este profissional não atende neste dia.");
    return;
  }

  const inicioMinutos = minutosHora(horario);
  const duracao = servicos[servico].minutos;
  const fimMinutos = inicioMinutos + duracao;
  const dia = new Date(data + "T12:00:00").getDay();
  const limite = dia === 6 ? 19 * 60 : 19 * 60 + 30;

  const dentroDoHorario =
    (inicioMinutos >= 9 * 60 && fimMinutos <= 12 * 60) ||
    (inicioMinutos >= 14 * 60 && fimMinutos <= limite);

  if (!dentroDoHorario) {
    alert("Horário fora do expediente.");
    return;
  }

  if (botao) {
    botao.disabled = true;
    botao.textContent = "RESERVANDO...";
  }

  const { data: reserva, error } = await db.rpc("create_booking", {
    p_client_name: nome,
    p_service: servico,
    p_barber: profissional,
    p_date: data,
    p_start_time: formatarHora(inicioMinutos)
  });

  if (error) {
    console.error("Erro ao reservar:", error);

    if (
      error.code === "23P01" ||
      error.message.includes("reservado")
    ) {
      alert("Este horário acabou de ser reservado. Escolha outro.");
    } else {
      alert("Não foi possível reservar: " + error.message);
    }

    if (botao) {
      botao.disabled = false;
      botao.textContent = "RESERVAR HORÁRIO";
    }

    await atualizarHorarios();
    return;
  }

  const dataLocalAgendamento = new Date(data + "T12:00:00");
  const diaSemana = dataLocalAgendamento.toLocaleDateString("pt-BR", {
    weekday: "long"
  });
  const partes = data.split("-");
  const dataFormatada =
    `${diaSemana}, ${partes[2]}/${partes[1]}/${partes[0]}`;

  const mensagem =
    `Olá, ${profissional}! Acabei de reservar um horário pelo site da Arruda Barber.\n\n` +
    `Nome: ${nome}\n` +
    `Telefone: ${telefoneCliente}\n` +
    `Serviço: ${servico}\n` +
    `Duração: ${duracao} minutos\n` +
    `Data: ${dataFormatada}\n` +
    `Horário: ${horario}\n\n` +
    `Meu horário já está confirmado pelo site. Obrigado!`;

  const link =
    "https://wa.me/" +
    profissionais[profissional] +
    "?text=" +
    encodeURIComponent(mensagem);

  alert("Horário reservado e confirmado com sucesso!");
  window.location.href = link;
});

console.log("Arruda Barber conectada ao Supabase!");
