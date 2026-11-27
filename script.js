
const SUPABASE_URL = "https://kduaktloheptwyzynppf.supabase.co";
const SUPABASE_KEY = "sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  alert("Não foi possível carregar o sistema de agendamento. Verifique sua internet e atualize a página.");
  throw new Error("Biblioteca Supabase não carregada.");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const VAPID_PUBLIC_KEY = "BAcudFBcLVAWw4m04KoijgcdeQEP7J0oAuYL4B531z3s1-9KTWuaKYO9AcqhGoEMDvh5n8dHYy_RRLLHnM-xoMY";
function vapidBytes(value){const pad="=".repeat((4-value.length%4)%4);const raw=atob((value+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
const botaoNotificacoesCliente=document.getElementById("ativarNotificacoesCliente");
if(botaoNotificacoesCliente){
 botaoNotificacoesCliente.addEventListener("click",async()=>{
  botaoNotificacoesCliente.disabled=true;botaoNotificacoesCliente.textContent="ATIVANDO...";
  try{
   if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))throw new Error("No iPhone, adicione o site à Tela de Início e abra pelo ícone para ativar avisos.");
   const permission=await Notification.requestPermission();
   if(permission!=="granted")throw new Error("Permissão de notificação não concedida.");
   const reg=await navigator.serviceWorker.register("./sw.js");await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   if(sub){const oldKey=sub.options.applicationServerKey?new Uint8Array(sub.options.applicationServerKey):null;const newKey=vapidBytes(VAPID_PUBLIC_KEY);if(!oldKey||oldKey.length!==newKey.length||!oldKey.every((v,i)=>v===newKey[i])){await sub.unsubscribe();sub=null;}}
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC_KEY)});
   localStorage.setItem("arruda_client_push_subscription",JSON.stringify(sub.toJSON()));
   botaoNotificacoesCliente.textContent="✓ AVISOS ATIVADOS";
  }catch(e){alert(e.message||"Não foi possível ativar avisos.");botaoNotificacoesCliente.disabled=false;botaoNotificacoesCliente.textContent="🔔 TENTAR ATIVAR AVISOS";}
 });
}


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
const campoWhatsapp = document.getElementById("whatsapp");
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
const botaoAdicionarAgendaReserva = document.getElementById("adicionarAgendaReserva");
let dadosReservaCalendario = null;
let linkWhatsAppReserva = "";

if (!formulario || !campoNome || !campoWhatsapp || !campoServico || !campoProfissional || !campoData || !campoHorario || !botao) {
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
  campoHorario.dataset.consultaErro = "";

  try {
    // Consulta usando o cliente Supabase oficial, que gerencia cabeçalhos e erros PostgREST.
    async function consultar(funcao) {
      const resposta = await db.rpc(funcao, { p_date: data, p_barber: profissional });
      if (resposta.error) throw resposta.error;
      return resposta.data || [];
    }

    let ocupados;
    try {
      ocupados = await consultar("get_busy_intervals_v2");
    } catch (erroV2) {
      console.warn("RPC v2 falhou; fallback:", erroV2);
      ocupados = await consultar("get_busy_intervals");
    }
    if (versaoAtual !== versaoConsultaHorarios) return;
    if (!Array.isArray(ocupados)) throw new Error("Resposta da agenda em formato inesperado.");

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
    adicionarPeriodo(14 * 60, dia === 6 ? 19 * 60 : 19 * 60 + 30);
    if (versaoAtual !== versaoConsultaHorarios) return;

    campoHorario.innerHTML = '<option value="">Escolha um horário</option>';
    horarios.forEach(function(horario) { campoHorario.add(new Option(horario, horario)); });
    if (!horarios.length) campoHorario.innerHTML = '<option value="">Não há horários disponíveis</option>';
  } catch (erro) {
    console.error("Falha ao consultar horários:", erro);
    if (versaoAtual !== versaoConsultaHorarios) return;
    const detalhe = String(erro && erro.message ? erro.message : "Erro desconhecido");
    campoHorario.dataset.consultaErro = detalhe;
    campoHorario.innerHTML = '<option value="">Falha: ' + detalhe.replace(/[<>&"]/g, "") + '</option>';
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

if (botaoAdicionarAgendaReserva) {
  botaoAdicionarAgendaReserva.addEventListener("click", function() {
    if (!dadosReservaCalendario) { alert("Não foi possível preparar os dados da agenda."); return; }
    const inicio = dadosReservaCalendario.data.replace(/-/g,"") + "T" + dadosReservaCalendario.horario.replace(":","") + "00";
    const fimMin = minutosHora(dadosReservaCalendario.horario) + dadosReservaCalendario.duracao;
    const fim = dadosReservaCalendario.data.replace(/-/g,"") + "T" + String(Math.floor(fimMin/60)).padStart(2,"0") + String(fimMin%60).padStart(2,"0") + "00";
    const titulo = "Arruda Barber - " + dadosReservaCalendario.servico;
    const detalhes = "Profissional: " + dadosReservaCalendario.profissional + "\nValor: " + dadosReservaCalendario.valor + "\nAgendamento Arruda Barber";
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(titulo)+"&dates="+inicio+"/"+fim+"&details="+encodeURIComponent(detalhes);
    window.open(url,"_blank");
  });
}

if (botaoEnviarWhatsAppReserva) {
  botaoEnviarWhatsAppReserva.addEventListener("click", function() {
    if (!linkWhatsAppReserva) { alert("Link do WhatsApp ainda não foi preparado. Confira se o agendamento foi concluído."); return; }
    window.open(linkWhatsAppReserva, "_self");
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

      const mensagem = "Olá, " + cancelado.barber + "! Estou avisando que meu agendamento foi cancelado pelo site da Arruda Barber.\
\
" +
        "Nome: " + (cancelado.client_name || "") + "\
" +
        "Serviço: " + (cancelado.service || "") + "\
" +
        "Data: " + dataFormatada + "\
" +
        "Horário: " + String(cancelado.start_time).slice(0, 5) + "\
\
" +
        (cancelado.cancel_fee_applies ? "Cancelamento realizado com menos de 30 minutos de antecedência. A política da barbearia prevê taxa de R$ 15,00.\
\
" : "Cancelamento realizado com pelo menos 30 minutos de antecedência, sem taxa.\
\
") + "Cancelamento confirmado pelo site. Obrigado!";

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
  let telefoneCliente = "";
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
      p_start_time: formatarHora(inicioMinutos),
      p_client_phone: telefoneCliente
    });

    if (resposta.error) throw resposta.error;
    reserva = resposta.data;
    // Executa notificações sem bloquear a confirmação nem o botão do WhatsApp.
    (async function(){
      // Durante a ação de reservar, tenta habilitar o Push caso o cliente ainda não tenha inscrição.
      let inscricaoCliente=localStorage.getItem("arruda_client_push_subscription");
      if(!inscricaoCliente && reserva && reserva.booking_id && ("Notification" in window) && Notification.permission!=="denied" && ("serviceWorker" in navigator) && ("PushManager" in window)){
        try{
          const permissao=Notification.permission==="granted" ? "granted" : await Notification.requestPermission();
          if(permissao==="granted"){
            const reg=await navigator.serviceWorker.register("./sw.js");
            await navigator.serviceWorker.ready;
            let sub=await reg.pushManager.getSubscription();
            if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC_KEY)});
            inscricaoCliente=JSON.stringify(sub.toJSON());
            localStorage.setItem("arruda_client_push_subscription",inscricaoCliente);
          }
        }catch(pushErro){console.warn("Push do cliente não ativado durante agendamento:",pushErro);}
      }
      if(inscricaoCliente && reserva && reserva.booking_id){
        try{
          const vinculoCliente=await fetch("https://kduaktloheptwyzynppf.supabase.co/functions/v1/barber-portal-api",{
            method:"POST",mode:"cors",cache:"no-store",
            headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY},
            body:JSON.stringify({action:"subscribe-client",bookingId:reserva.booking_id,subscription:JSON.parse(inscricaoCliente)})
          });
          if(!vinculoCliente.ok) console.warn("Push do cliente não vinculado:",await vinculoCliente.text());
        }catch(erro){console.warn("Inscrição do cliente não vinculada:",erro);}
      }
      // Dispara o alerta do profissional após o banco confirmar a reserva.
      if(reserva && reserva.booking_id){
        try {
          const pushResposta = await fetch("https://kduaktloheptwyzynppf.supabase.co/functions/v1/barber-portal-api",{
            method:"POST",mode:"cors",cache:"no-store",
            headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY},
            body:JSON.stringify({action:"notify-booking",bookingId:reserva.booking_id})
          });
          const pushResultado = await pushResposta.json().catch(()=>({}));
          if(!pushResposta.ok || pushResultado.sent===0) console.warn("Push ao profissional não confirmado:",pushResultado);
        } catch(erro){console.warn("Aviso push ao profissional não enviado:",erro);}
      }
    })().catch(function(e){console.warn('Falha nas notificações em segundo plano:',e);});
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

  const mensagem = "Olá, " + profissional + "! Acabei de reservar um horário pelo site da Arruda Barber.

" +
    "Nome: " + nome + "
" +
    "Serviço: " + nomeServicoAgendamento(servico) + "
" +
    "Valor: " + precoTotalServico(servico).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "
" +
    "Duração: " + duracaoTotalServico(servico) + " minutos
" +
    "Data: " + dataFormatada + "
" +
    "Horário: " + horario + "

" +
    "Seu horário já está reservado!

" +
    (linkCancelamento
      ? "Quero cancelar meu horário: " + linkCancelamento
      : "Para cancelar, entre em contato com a barbearia.");

  const telefoneProfissional = profissionais[profissional];
  const linkWhatsApp = "https://wa.me/" + telefoneProfissional + "?text=" + encodeURIComponent(mensagem);

  linkWhatsAppReserva = linkWhatsApp;
  dadosReservaCalendario = { data, horario, duracao: duracaoTotalServico(servico), profissional, servico: nomeServicoAgendamento(servico), valor: precoTotalServico(servico).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) };

  if (detalhesConfirmacao) {
    detalhesConfirmacao.textContent =
      "Nome: " + nome + " | Profissional: " + profissional + " | Serviço: " + nomeServicoAgendamento(servico) +
      " | Data: " + dataFormatada + " | Horário: " + horario +
      " | Valor: " + precoTotalServico(servico).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  if (confirmacaoReserva) {
    confirmacaoReserva.hidden = false;
    confirmacaoReserva.style.display = "block";
    confirmacaoReserva.style.visibility = "visible";
    confirmacaoReserva.style.opacity = "1";
    confirmacaoReserva.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  botao.disabled = true;
  botao.textContent = "HORÁRIO RESERVADO";

  if (confirmacaoReserva) confirmacaoReserva.scrollIntoView({ behavior: "smooth", block: "center" });
  alert("Agendamento realizado e reservado! Escolha abaixo se deseja adicionar à agenda ou avisar o profissional pelo WhatsApp.");
});

console.log("Arruda Barber: sistema de agendamento carregado.");
