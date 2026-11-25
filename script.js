
const SUPABASE_URL = "https://kduaktloheptwyzynppf.supabase.co";
const SUPABASE_KEY = "sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  alert("Não foi possível carregar o sistema de agendamento. Verifique sua internet e atualize a página.");
  throw new Error("Biblioteca Supabase não carregada.");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const profissionais = {
  Arruda: "5555992294941",
  Felipe: "5555991274993",
  Thalita: "5555991692449"
};

const servicos = {
  "Corte degradê": { preco: 35, minutos: 30 },
  "Corte infantil": { preco: 35, minutos: 30 },
  "Corte degradê (navalhado)": { preco: 40, minutos: 35 },
  "Corte social": { preco: 35, minutos: 30 },
  "Cabelo e barba": { preco: 55, minutos: 50 },
  "Cabelo, barba e sobrancelha": { preco: 60, minutos: 55 },
  "Corte 2 pentes": { preco: 25, minutos: 20 },
  "Corte 1 pente": { preco: 20, minutos: 15 },
  "Pezinhos": { preco: 15, minutos: 10 },
  "Sobrancelha": { preco: 10, minutos: 10 },
  "Barba": { preco: 25, minutos: 20 }
};

const formulario = document.getElementById("formAgendamento");
const campoNome = document.getElementById("nome");
const campoServico = document.getElementById("servico");
const campoProfissional = document.getElementById("profissional");
const campoData = document.getElementById("data");
const campoHorario = document.getElementById("horario");
const campoPrecoServico = document.getElementById("precoServico");
const opcaoSobrancelha = document.getElementById("opcaoSobrancelha");
const campoAdicionarSobrancelha = document.getElementById("adicionarSobrancelha");
const servicosComOpcaoSobrancelha = ["Corte degradê", "Corte infantil", "Corte degradê (navalhado)", "Corte social", "Cabelo e barba", "Corte 2 pentes", "Corte 1 pente"];
const botao = formulario ? formulario.querySelector('button[type="submit"]') : null;
const botaoTentarHorarios = document.getElementById("botaoTentarHorarios");
const campoCodigoCancelamento = document.getElementById("codigoCancelamento");
const botaoCancelar = document.getElementById("botaoCancelar");
const confirmacaoReserva = document.getElementById("confirmacaoReserva");
const detalhesConfirmacao = document.getElementById("detalhesConfirmacao");
const botaoEnviarWhatsAppReserva = document.getElementById("enviarWhatsAppReserva");
let linkWhatsAppReserva = "";

if (!formulario || !campoNome || !campoServico || !campoProfissional || !campoData || !campoHorario || !botao) {
  console.error("Campos obrigatórios do agendamento não encontrados.");
  throw new Error("Formulário de agendamento incompleto.");
}

function dataHoraSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const valores = {};
  partes.forEach(function(parte) {
    if (parte.type !== "literal") valores[parte.type] = parte.value;
  });

  return {
    data: valores.year + "-" + valores.month + "-" + valores.day,
    minutos: Number(valores.hour) * 60 + Number(valores.minute)
  };
}

function minutosHora(hora) {
  const partes = String(hora).split(":");
  return Number(partes[0]) * 60 + Number(partes[1]);
}

function formatarHora(minutos) {
  const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
  const minuto = String(minutos % 60).padStart(2, "0");
  return hora + ":" + minuto + ":00";
}

function diaPermitido(data, profissional) {
  if (!data) return false;
  const dia = new Date(data + "T12:00:00").getDay();
  if (dia === 0 || dia === 1) return false;
  if (profissional === "Arruda" && dia === 3) return false;
  return true;
}

function temSobrancelhaAdicional() {
  return Boolean(campoAdicionarSobrancelha && campoAdicionarSobrancelha.checked &&
    servicosComOpcaoSobrancelha.includes(campoServico.value));
}

function precoTotalServico(servico) {
  return servicos[servico].preco + (temSobrancelhaAdicional() ? 5 : 0);
}

function duracaoTotalServico(servico) {
  return servicos[servico].minutos + (temSobrancelhaAdicional() ? 10 : 0);
}

function nomeServicoAgendamento(servico) {
  return servico + (temSobrancelhaAdicional() ? " + Sobrancelha" : "");
}

function atualizarPrecoServico() {
  if (!campoPrecoServico) return;
  const selecionado = servicos[campoServico.value];
  const permiteAdicional = servicosComOpcaoSobrancelha.includes(campoServico.value);
  if (opcaoSobrancelha) opcaoSobrancelha.hidden = !permiteAdicional;
  if (!permiteAdicional && campoAdicionarSobrancelha) campoAdicionarSobrancelha.checked = false;
  if (!selecionado) {
    campoPrecoServico.textContent = "Selecione um serviço para ver o valor.";
    return;
  }
  const valor = precoTotalServico(campoServico.value);
  campoPrecoServico.textContent = "Valor do serviço: " + valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) +
    (temSobrancelhaAdicional() ? " (inclui sobrancelha)" : "");
}

atualizarPrecoServico();
// Não ofereça como primeira opção um dia em que a barbearia está fechada.
function proximaDataDeAtendimento() {
  const agora = dataHoraSaoPaulo().data;
  const data = new Date(agora + "T12:00:00");
  while (data.getDay() === 0 || data.getDay() === 1) data.setDate(data.getDate() + 1);
  return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0");
}
campoData.min = proximaDataDeAtendimento();

if (campoCodigoCancelamento) {
  const parametros = new URLSearchParams(window.location.search);
  const codigoLink = parametros.get("cancel");
  if (codigoLink) {
    campoCodigoCancelamento.value = codigoLink;
    const secaoCancelar = document.getElementById("cancelar");
    if (secaoCancelar) secaoCancelar.scrollIntoView({ behavior: "smooth" });
  }
}

let versaoConsultaHorarios = 0;

async function atualizarHorarios() {
  const versaoAtual = ++versaoConsultaHorarios;
  const data = campoData.value;
  const servico = campoServico.value;
  const profissional = campoProfissional.value;

  if (botaoTentarHorarios) botaoTentarHorarios.hidden = true;

  if (!data || !servico || !profissional) {
    campoHorario.innerHTML = '<option value="">Escolha data, serviço e profissional</option>';
    return;
  }

  if (!diaPermitido(data, profissional)) {
    campoHorario.innerHTML = '<option value="">Profissional não atende neste dia</option>';
    return;
  }

  campoHorario.innerHTML = '<option value="">Carregando horários...</option>';

  try {
    const resposta = await db.rpc("get_busy_intervals_v2", {
      p_date: data,
      p_barber: profissional
    });

    if (versaoAtual !== versaoConsultaHorarios) return;
    if (resposta.error) throw resposta.error;

    const ocupados = Array.isArray(resposta.data) ? resposta.data : [];
    const duracao = duracaoTotalServico(servico);
    const agora = dataHoraSaoPaulo();
    const horarios = [];

    function adicionarPeriodo(inicio, fim) {
      for (let minuto = inicio; minuto <= fim; minuto += 15) {
        if (data < agora.data || (data === agora.data && minuto <= agora.minutos)) continue;

        const fimSlot = minuto + duracao;
        const conflito = ocupados.some(function(item) {
          const inicioOcupado = minutosHora(item.start_time);
          const fimOcupado = minutosHora(item.end_time);
          return minuto < fimOcupado && fimSlot > inicioOcupado;
        });

        if (!conflito) horarios.push(String(Math.floor(minuto / 60)).padStart(2, "0") + ":" + String(minuto % 60).padStart(2, "0"));
      }
    }

    const dia = new Date(data + "T12:00:00").getDay();
    adicionarPeriodo(9 * 60, 11 * 60 + 30);

    if (dia === 6) {
      adicionarPeriodo(14 * 60, 19 * 60);
    } else {
      adicionarPeriodo(14 * 60, 19 * 60 + 30);
    }

    if (versaoAtual !== versaoConsultaHorarios) return;

    campoHorario.innerHTML = '<option value="">Escolha um horário</option>';
    horarios.forEach(function(horario) {
      campoHorario.add(new Option(horario, horario));
    });

    if (!horarios.length) {
      campoHorario.innerHTML = '<option value="">Não há horários disponíveis</option>';
    }
  } catch (erro) {
    console.error("Falha ao consultar horários:", erro);
    if (versaoAtual !== versaoConsultaHorarios) return;
    campoHorario.innerHTML = '<option value="">Não foi possível carregar os horários</option>';
    if (botaoTentarHorarios) botaoTentarHorarios.hidden = false;
  }
}

campoData.addEventListener("change", function() {
  // Mantém a data visível para que o seletor do celular continue editável.
  // Dias fechados apenas não exibem horários; o cliente pode escolher outra data.
  atualizarHorarios();
});

campoServico.addEventListener("change", function() {
  atualizarPrecoServico();
  atualizarHorarios();
});

if (campoAdicionarSobrancelha) {
  campoAdicionarSobrancelha.addEventListener("change", function() {
    atualizarPrecoServico();
    atualizarHorarios();
  });
}

campoProfissional.addEventListener("change", function() {
  // Trocar de profissional não apaga a data escolhida pelo cliente.
  atualizarHorarios();
});

if (botaoTentarHorarios) {
  botaoTentarHorarios.addEventListener("click", atualizarHorarios);
}

if (botaoEnviarWhatsAppReserva) {
  botaoEnviarWhatsAppReserva.addEventListener("click", function() {
    if (linkWhatsAppReserva) window.location.assign(linkWhatsAppReserva);
  });
}

if (botaoCancelar && campoCodigoCancelamento) {
  botaoCancelar.addEventListener("click", async function() {
    const token = campoCodigoCancelamento.value.trim();

    if (!token) {
      alert("Cole o link ou código de cancelamento recebido.");
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      alert("O código informado não parece válido. Abra o link original recebido pelo WhatsApp ou confira o código.");
      return;
    }

    if (!confirm("Tem certeza de que deseja cancelar este agendamento?")) return;

    botaoCancelar.disabled = true;
    botaoCancelar.textContent = "CANCELANDO...";

    try {
      const resposta = await db.rpc("cancel_booking", { p_token: token });
      if (resposta.error) throw resposta.error;

      const cancelado = resposta.data;
      if (!cancelado || !cancelado.cancelled) {
        alert("Código inválido, horário já cancelado ou agendamento já realizado.");
        return;
      }

      campoCodigoCancelamento.value = "";

      const partes = String(cancelado.booking_date).split("-");
      const dataCancelada = new Date(String(cancelado.booking_date) + "T12:00:00");
      const diaCancelado = dataCancelada.toLocaleDateString("pt-BR", { weekday: "long" });
      const dataFormatada = diaCancelado + ", " + partes[2] + "/" + partes[1] + "/" + partes[0];
      const telefone = profissionais[cancelado.barber];

      if (!telefone) {
        alert("Agendamento cancelado. Não foi possível identificar o WhatsApp do profissional.");
        return;
      }

      const mensagem = "Olá, " + cancelado.barber + "! Estou avisando que meu agendamento foi cancelado pelo site da Arruda Barber.\\n\\n" +
        "Nome: " + (cancelado.client_name || "") + "\\n" +
        "Serviço: " + (cancelado.service || "") + "\\n" +
        "Data: " + dataFormatada + "\\n" +
        "Horário: " + String(cancelado.start_time).slice(0, 5) + "\\n\\n" +
        "Cancelamento confirmado pelo site. Obrigado!";

      const linkWhatsApp = "https://wa.me/" + telefone + "?text=" + encodeURIComponent(mensagem);
      alert("Agendamento cancelado! Vamos abrir o WhatsApp do profissional para avisar.");
      window.location.assign(linkWhatsApp);
    } catch (erro) {
      console.error("Erro ao cancelar agendamento:", erro);
      alert("Não foi possível concluir o cancelamento por enquanto. Verifique sua conexão e tente novamente. Se continuar, fale diretamente com a barbearia.");
    } finally {
      botaoCancelar.disabled = false;
      botaoCancelar.textContent = "CANCELAR AGENDAMENTO";
    }
  });
}

formulario.addEventListener("submit", async function(evento) {
  evento.preventDefault();
  if (botao.disabled) return;

  const nome = campoNome.value.trim();
  const servico = campoServico.value;
  const profissional = campoProfissional.value;
  const data = campoData.value;
  const horario = campoHorario.value;

  if (!nome || !servico || !profissional || !data || !horario) {
    alert("Preencha todos os campos do agendamento.");
    return;
  }

  if (nome.length > 80) {
    alert("O nome deve ter no máximo 80 caracteres.");
    campoNome.focus();
    return;
  }

  if (!servicos[servico] || !Object.prototype.hasOwnProperty.call(profissionais, profissional)) {
    alert("Confira o serviço e o profissional selecionados.");
    return;
  }

  const agora = dataHoraSaoPaulo();
  if (data < agora.data) {
    alert("Escolha uma data de hoje em diante.");
    return;
  }

  if (!diaPermitido(data, profissional)) {
    alert("Esse profissional não atende nesta data. Escolha outro dia.");
    return;
  }

  if (!/^\d{2}:\d{2}$/.test(horario)) {
    alert("Escolha um horário válido na lista.");
    return;
  }

  const inicioMinutos = minutosHora(horario);
  if (!Number.isFinite(inicioMinutos) || inicioMinutos % 15 !== 0) {
    alert("Escolha um horário válido na lista.");
    return;
  }

  if (data === agora.data && inicioMinutos <= agora.minutos) {
    alert("Esse horário já passou. Escolha outro horário.");
    await atualizarHorarios();
    return;
  }

  const dia = new Date(data + "T12:00:00").getDay();
  const limite = dia === 6 ? 19 * 60 : 19 * 60 + 30;
  const dentroDoHorario =
    (inicioMinutos >= 9 * 60 && inicioMinutos <= 11 * 60 + 30) ||
    (inicioMinutos >= 14 * 60 && inicioMinutos <= limite);

  if (!dentroDoHorario) {
    alert("Horário fora do expediente. Escolha um horário disponível na lista.");
    await atualizarHorarios();
    return;
  }

  botao.disabled = true;
  botao.textContent = "RESERVANDO...";

  let reserva;
  try {
    const resposta = await db.rpc("create_booking", {
      p_client_name: nome,
      p_service: nomeServicoAgendamento(servico),
      p_barber: profissional,
      p_date: data,
      p_start_time: formatarHora(inicioMinutos)
    });

    if (resposta.error) throw resposta.error;
    reserva = resposta.data;
    // Dispara o alerta do profissional após o banco confirmar a reserva.
    if(reserva && reserva.booking_id){
      fetch("https://kduaktloheptwyzynppf.supabase.co/functions/v1/barber-portal-api",{
        method:"POST",mode:"cors",cache:"no-store",
        headers:{"Content-Type":"application/json","apikey":"sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4","Authorization":"Bearer sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4"},
        body:JSON.stringify({action:"notify-booking",bookingId:reserva.booking_id})
      }).catch(function(erro){console.warn("Aviso push ao profissional não enviado:",erro);});
    }
  } catch (erro) {
    console.error("Erro ao reservar:", erro);

    const codigo = erro && erro.code;
    const mensagemErro = String((erro && erro.message) || "").toLowerCase();

    if (codigo === "23P01" || mensagemErro.includes("reservado") || mensagemErro.includes("overlap")) {
      alert("Esse horário acabou de ser ocupado. Atualizamos a lista; escolha outro horário.");
      await atualizarHorarios();
    } else if (erro && (erro.name === "TypeError" || mensagemErro.includes("fetch"))) {
      alert("A conexão caiu ou a resposta do servidor não chegou. Para evitar uma reserva duplicada, atualize os horários antes de tentar novamente. Se o horário sumir da lista, a reserva pode ter sido confirmada.");
      await atualizarHorarios();
    } else {
      alert("Não foi possível confirmar o agendamento. Confira os dados e tente novamente. Se o erro continuar, fale com a barbearia.");
      await atualizarHorarios();
    }

    botao.disabled = false;
    botao.textContent = "RESERVAR HORÁRIO";
    return;
  }

  const partes = data.split("-");
  const dataAgendamento = new Date(data + "T12:00:00");
  const diaSemana = dataAgendamento.toLocaleDateString("pt-BR", { weekday: "long" });
  const dataFormatada = diaSemana + ", " + partes[2] + "/" + partes[1] + "/" + partes[0];
  const tokenCancelamento = reserva && reserva.cancellation_token;
  const linkCancelamento = tokenCancelamento
    ? window.location.origin + window.location.pathname + "?cancel=" + encodeURIComponent(tokenCancelamento) + "#cancelar"
    : "";

  const mensagem = "Olá, " + profissional + "! Acabei de reservar um horário pelo site da Arruda Barber.\n\n" +
    "Nome: " + nome + "\n" +
    "Serviço: " + nomeServicoAgendamento(servico) + "\n" +
    "Valor: " + precoTotalServico(servico).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "\n" +
    "Duração: " + duracaoTotalServico(servico) + " minutos\n" +
    "Data: " + dataFormatada + "\n" +
    "Horário: " + horario + "\n\n" +
    "Seu horário está aguardando a confirmação do profissional.\n\n" +
    (linkCancelamento
      ? "Quero cancelar meu horário: " + linkCancelamento
      : "Para cancelar, entre em contato com a barbearia.");

  const telefoneProfissional = profissionais[profissional];
  const linkWhatsApp = "https://wa.me/" + telefoneProfissional + "?text=" + encodeURIComponent(mensagem);

  linkWhatsAppReserva = linkWhatsApp;

  if (detalhesConfirmacao) {
    detalhesConfirmacao.textContent =
      "Nome: " + nome + " | Profissional: " + profissional + " | Serviço: " + nomeServicoAgendamento(servico) +
      " | Data: " + dataFormatada + " | Horário: " + horario +
      " | Valor: " + precoTotalServico(servico).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  if (confirmacaoReserva) {
    confirmacaoReserva.hidden = false;
    confirmacaoReserva.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  botao.disabled = true;
  botao.textContent = "HORÁRIO RESERVADO";

  // Abre o WhatsApp automaticamente após a confirmação efetiva no banco.
  window.location.assign(linkWhatsApp);
});

console.log("Arruda Barber: sistema de agendamento carregado.");
