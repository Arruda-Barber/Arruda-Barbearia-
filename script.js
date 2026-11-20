const SUPABASE_URL = "https://asidqwdyjxswnjolfavj.supabase.co";
const SUPABASE_KEY = "sb_publishable_i3rLs1hxhmrcYpruXxGdDw_APase-8x";

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
const botao = formulario.querySelector('button[type="submit"]');

function dataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

campoData.min = dataLocal(new Date());

async function atualizarHorarios() {
  campoHorario.innerHTML = '<option value="">Carregando horários...</option>';

  const data = campoData.value;
  const servico = campoServico.value;
  const profissional = campoProfissional.value;

  if (!data || !servico || !profissional) {
    campoHorario.innerHTML = '<option value="">Escolha data, serviço e profissional</option>';
    return;
  }

  const dia = new Date(data + "T12:00:00").getDay();

  if (dia === 0 || dia === 1) {
    campoHorario.innerHTML = '<option value="">Fechado aos domingos e segundas</option>';
    return;
  }

  if (profissional === "Arruda" && dia === 3) {
    campoHorario.innerHTML = '<option value="">Arruda não atende às quartas-feiras</option>';
    return;
  }

  const { data: ocupados, error } = await db.rpc("consultar_horarios", {
    p_data: data,
    p_barbeiro: profissional
  });

  if (error) {
    console.error(error);
    campoHorario.innerHTML = '<option value="">Erro ao consultar agenda. Tente novamente.</option>';
    return;
  }

  const duracao = servicos[servico].minutos;
  const agora = new Date();
  const horarios = [];

  function adicionarPeriodo(inicio, fim) {
    for (let minuto = inicio; minuto + duracao <= fim; minuto += 15) {
      const hora = String(Math.floor(minuto / 60)).padStart(2, "0");
      const min = String(minuto % 60).padStart(2, "0");
      const horario = `${hora}:${min}`;

      const inicioSlot = new Date(`${data}T${horario}:00-03:00`);
      const fimSlot = new Date(inicioSlot.getTime() + duracao * 60000);

      if (inicioSlot <= agora) continue;

      const conflito = (ocupados || []).some(item => {
        const inicioOcupado = new Date(item.inicio);
        const fimOcupado = new Date(item.fim);

        return inicioSlot < fimOcupado && fimSlot > inicioOcupado;
      });

      if (!conflito) horarios.push(horario);
    }
  }

  adicionarPeriodo(8 * 60 + 30, 11 * 60 + 30);
  adicionarPeriodo(14 * 60, 19 * 60 + 30);

  campoHorario.innerHTML = '<option value="">Escolha um horário</option>';

  horarios.forEach(horario => {
    campoHorario.add(new Option(horario, horario));
  });

  if (!horarios.length) {
    campoHorario.innerHTML = '<option value="">Não há horários disponíveis</option>';
  }
}

campoData.addEventListener("change", atualizarHorarios);
campoServico.addEventListener("change", atualizarHorarios);
campoProfissional.addEventListener("change", atualizarHorarios);

formulario.addEventListener("submit", async function(event) {
  event.preventDefault();

  const nome = campoNome.value.trim();
  const telefoneCliente = campoTelefone.value.trim();
  const servico = campoServico.value;
  const profissional = campoProfissional.value;
  const data = campoData.value;
  const horario = campoHorario.value;

  if (!nome || !telefoneCliente || !servico || !profissional || !data || !horario) {
    alert("Preencha todos os campos.");
    return;
  }

  const inicio = new Date(`${data}T${horario}:00-03:00`);
  const dia = new Date(data + "T12:00:00").getDay();

  if (dia === 0 || dia === 1 || (profissional === "Arruda" && dia === 3)) {
    alert("Este profissional não atende neste dia.");
    return;
  }

  botao.disabled = true;
  botao.textContent = "RESERVANDO...";

  const { error } = await db.rpc("criar_agendamento", {
    p_cliente_nome: nome,
    p_cliente_telefone: telefoneCliente,
    p_barbeiro: profissional,
    p_servico: servico,
    p_inicio: inicio.toISOString(),
    p_duracao: servicos[servico].minutos
  });

  if (error) {
    console.error(error);

    if (error.message.includes("HORARIO_INDISPONIVEL")) {
      alert("Este horário acabou de ser reservado. Escolha outro horário.");
    } else {
      alert("Não foi possível reservar. Verifique os dados e tente novamente.");
    }

    botao.disabled = false;
    botao.textContent = "CONFIRMAR PELO WHATSAPP";
    await atualizarHorarios();
    return;
  }

  const partes = data.split("-");
  const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

  const mensagem =
    `Olá, ${profissional}! Gostaria de confirmar meu agendamento na Arruda Barber.\n\n` +
    `Nome: ${nome}\n` +
    `Telefone: ${telefoneCliente}\n` +
    `Serviço: ${servico}\n` +
    `Duração: ${servicos[servico].minutos} minutos\n` +
    `Data: ${dataFormatada}\n` +
    `Horário: ${horario}\n\n` +
    `Aguardo a confirmação!`;

  const link = "https://wa.me/" + profissionais[profissional] +
    "?text=" + encodeURIComponent(mensagem);

  alert("Horário reservado com sucesso!");
  window.location.href = link;
});

console.log("Arruda Barber conectada ao Supabase!");