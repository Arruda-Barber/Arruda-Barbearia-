const API="https://kduaktloheptwyzynppf.supabase.co/functions/v1/barber-portal-api";
const KEY="sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";
const $=id=>document.getElementById(id);
let pin=sessionStorage.getItem("arruda_staff_pin")||"", barber="";\nlet previousBookingIds=null, pollingStarted=false;\nfunction notifyNewBookings(rows){\n const ids=new Set(rows.map(x=>String(x.id)));\n if(previousBookingIds===null){previousBookingIds=ids;return;}\n const added=rows.filter(x=>!previousBookingIds.has(String(x.id))&&x.status==="pending");\n previousBookingIds=ids;\n added.forEach(x=>{\n  const message=x.client_name+" — "+x.service+" — "+fmtDate(x.booking_date)+" às "+fmtTime(x.start_time);\n  $("agendaMessage").textContent="Novo agendamento: "+message;\n  if("Notification" in window && Notification.permission==="granted"){try{new Notification("Arruda Barber: novo horário",{body:message,tag:String(x.id)});}catch(e){}}\n  if(navigator.vibrate)navigator.vibrate([200,100,200]);\n });\n}\nfunction startPolling(){if(pollingStarted)return;pollingStarted=true;setInterval(()=>{if(pin)load(true);},15000);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtDate(v){const [y,m,d]=String(v).slice(0,10).split("-").map(Number);return new Date(y,m-1,d,12).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});}
function fmtTime(v){return String(v||"").slice(0,5);}
async function api(action="list",extra={}){const r=await fetch(API,{method:"POST",mode:"cors",cache:"no-store",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY},body:JSON.stringify({pin,action,...extra})});const d=await r.json().catch(()=>({error:"Resposta inválida do servidor."}));if(!r.ok)throw new Error(d.error||"Não foi possível acessar a agenda.");return d;}
function showAgenda(){$("loginView").classList.add("hidden");$("agendaView").classList.remove("hidden");}
function showLogin(){$("agendaView").classList.add("hidden");$("loginView").classList.remove("hidden");}
function render(rows){
 const el=$("bookingList");
 if(!rows.length){el.innerHTML='<div class="empty">Você não tem horários futuros pendentes ou confirmados.</div>';return;}
 el.innerHTML=rows.map(x=>{
  const pending=x.status==="pending";
  const actions=pending
   ? '<div class="actions"><button class="primary" data-decision="confirmed" data-id="'+esc(x.id)+'">Confirmar horário</button><button class="reject" data-decision="cancelled" data-id="'+esc(x.id)+'">Recusar</button></div>'
   : '<div class="actions"><button class="primary" data-finish="'+esc(x.id)+'">Registrar atendimento</button><button class="reject" data-noshow="'+esc(x.id)+'">Cliente faltou</button></div>';
  return '<article class="booking '+(pending?"is-pending":"")+'"><div class="booking-top"><span class="status '+(pending?"pending":"confirmed")+'">'+(pending?"AGUARDANDO CONFIRMAÇÃO":"CONFIRMADO")+'</span><time>'+esc(fmtTime(x.start_time))+'</time></div><h2>'+esc(x.client_name)+'</h2><p>'+esc(x.service)+'</p><p class="booking-date">'+esc(fmtDate(x.booking_date))+'</p>'+actions+'</article>';
 }).join("");
}
async function load(){$("agendaMessage").textContent="Carregando horários...";try{const d=await api();barber=d.barber;$("barberName").textContent=barber;render(d.bookings||[]);$("agendaMessage").textContent="Agenda atualizada.";}catch(e){$("agendaMessage").textContent=e.message;if(/PIN|tentativas|bloqueado/i.test(e.message)){sessionStorage.removeItem("arruda_staff_pin");pin="";showLogin();}}}
$("staffLogin").addEventListener("submit",async e=>{e.preventDefault();const value=$("staffPin").value.trim();if(!/^\d{6}$/.test(value))return;$("loginMessage").textContent="Verificando acesso...";pin=value;try{const d=await api();sessionStorage.setItem("arruda_staff_pin",pin);barber=d.barber;showAgenda();await load();startPolling();}catch(err){pin="";$("loginMessage").textContent=err.message;}});
$("logout").addEventListener("click",()=>{sessionStorage.removeItem("arruda_staff_pin");pin="";barber="";$("staffPin").value="";showLogin();$("loginMessage").textContent="Você saiu da sua agenda.";});
$("refresh").addEventListener("click",load);\nconst notifyButton=$("enableNotifications");\nif(notifyButton){\n if(!("Notification" in window)){notifyButton.textContent="Notificações não disponíveis neste navegador";notifyButton.disabled=true;}\n else if(Notification.permission==="granted"){notifyButton.textContent="Notificações ativadas ✓";notifyButton.disabled=true;}\n notifyButton.addEventListener("click",async()=>{try{const p=await Notification.requestPermission();if(p==="granted"){notifyButton.textContent="Notificações ativadas ✓";notifyButton.disabled=true;new Notification("Arruda Barber",{body:"Avisaremos quando chegar um novo agendamento."});}else $("agendaMessage").textContent="Permissão de notificação não concedida.";}catch(e){$("agendaMessage").textContent="Não foi possível ativar notificações neste navegador.";} });\n}
const prices={"Corte degradê":35,"Corte infantil":35,"Corte degradê (navalhado)":40,"Corte social":35,"Cabelo e barba":55,"Cabelo, barba e sobrancelha":60,"Corte 2 pentes":25,"Corte 1 pente":20,"Pezinhos":15,"Sobrancelha":10,"Barba":25};
$("bookingList").addEventListener("click",async e=>{
 const finish=e.target.closest("[data-finish]");
 const missed=e.target.closest("[data-noshow]");
 const decision=e.target.closest("[data-decision]");
 if(finish){
  const id=finish.dataset.finish;
  const card=finish.closest(".booking");
  const service=card.querySelector("p")?.textContent||"";
  const raw=prompt("Valor recebido pelo serviço (R$):",prices[service]||"");
  if(raw===null)return;
  const amount=Number(raw.trim().replace(",","."));
  if(!Number.isFinite(amount)||amount<=0){$("agendaMessage").textContent="Informe um valor válido.";return;}
  const method=prompt("Forma de pagamento: Pix, Cartão ou Dinheiro","Pix");
  if(method===null)return;
  const normalized=method.trim().toLowerCase();
  const payment=normalized==="pix"?"Pix":normalized==="cartão"||normalized==="cartao"?"Cartão":normalized==="dinheiro"?"Dinheiro":null;
  if(!payment){$("agendaMessage").textContent="Use Pix, Cartão ou Dinheiro.";return;}
  finish.disabled=true;
  try{await api("finish",{bookingId:id,amount,payment});$("agendaMessage").textContent="Atendimento registrado e faturamento atualizado!";await load();}
  catch(err){$("agendaMessage").textContent=err.message;finish.disabled=false;}
  return;
 }
 if(missed){
  if(!confirm("Confirmar que o cliente não compareceu a este horário?"))return;
  missed.disabled=true;
  try{await api("no-show",{bookingId:missed.dataset.noshow});$("agendaMessage").textContent="Falta registrada.";await load();}
  catch(err){$("agendaMessage").textContent=err.message;missed.disabled=false;}
  return;
 }
 if(decision){
  const choice=decision.dataset.decision;
  if(!confirm(choice==="confirmed"?"Deseja confirmar este horário?":"Deseja recusar este horário?"))return;
  decision.disabled=true;
  try{await api("decide",{bookingId:decision.dataset.id,decision:choice});$("agendaMessage").textContent=choice==="confirmed"?"Horário confirmado!":"Horário recusado.";await load();}
  catch(err){$("agendaMessage").textContent=err.message;decision.disabled=false;}
 }
});
if(pin){api().then(d=>{barber=d.barber;showAgenda();load();startPolling();}).catch(()=>{sessionStorage.removeItem("arruda_staff_pin");pin="";showLogin();});}else showLogin();