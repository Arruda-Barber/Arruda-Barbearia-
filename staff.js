const API="https://kduaktloheptwyzynppf.supabase.co/functions/v1/barber-portal-api";
const KEY="sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";
const $=id=>document.getElementById(id);
let pin=sessionStorage.getItem("arruda_staff_pin")||"", barber="";
let previousBookingIds=null, pollingStarted=false;
function notifyNewBookings(rows){
 const ids=new Set(rows.map(x=>String(x.id)));
 if(previousBookingIds===null){previousBookingIds=ids;return;}
 const added=rows.filter(x=>!previousBookingIds.has(String(x.id))&&x.status==="pending");
 previousBookingIds=ids;
 added.forEach(x=>{
  const message=x.client_name+" — "+x.service+" — "+fmtDate(x.booking_date)+" às "+fmtTime(x.start_time);
  $("agendaMessage").textContent="Novo agendamento: "+message;
  if("Notification" in window && Notification.permission==="granted"){try{new Notification("Arruda Barber: novo horário",{body:message,tag:String(x.id)});}catch(e){}}
  if(navigator.vibrate)navigator.vibrate([200,100,200]);
 });
}
function startPolling(){if(pollingStarted)return;pollingStarted=true;setInterval(()=>{if(pin)load(true);},15000);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtDate(v){const [y,m,d]=String(v).slice(0,10).split("-").map(Number);return new Date(y,m-1,d,12).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});}
function fmtTime(v){return String(v||"").slice(0,5);}
async function api(action="list",extra={}){const r=await fetch(API,{method:"POST",mode:"cors",cache:"no-store",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY},body:JSON.stringify({pin,action,...extra})});const d=await r.json().catch(()=>({error:"Resposta inválida do servidor."}));if(!r.ok){const err=new Error(d.error||"Não foi possível acessar a agenda.");err.details=d.errors||[];throw err;}return d;}
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
async function load(silent=false){if(!silent)$("agendaMessage").textContent="Carregando horários...";try{const d=await api();barber=d.barber;$("barberName").textContent=barber;notifyNewBookings(d.bookings||[]);render(d.bookings||[]);if(!silent)$("agendaMessage").textContent="Agenda atualizada. Atualização automática a cada 15 segundos.";}catch(e){if(!silent)$("agendaMessage").textContent=e.message;if(/PIN|tentativas|bloqueado/i.test(e.message)){sessionStorage.removeItem("arruda_staff_pin");pin="";showLogin();}}}
$("staffLogin").addEventListener("submit",async e=>{e.preventDefault();const value=$("staffPin").value.trim();if(!/^\\d{6}$/.test(value)){$("loginMessage").textContent="Digite os 6 números do PIN.";return;}const submit=$("staffLogin").querySelector("button[type=submit]");submit.disabled=true;submit.textContent="ENTRANDO...";$("loginMessage").textContent="Validando PIN e carregando agenda...";pin=value;try{const d=await api("list");sessionStorage.setItem("arruda_staff_pin",pin);barber=d.barber;$("barberName").textContent=barber;render(d.bookings||[]);showAgenda();$("agendaMessage").textContent="Agenda carregada.";await restoreSavedPush();startPolling();}catch(err){pin="";sessionStorage.removeItem("arruda_staff_pin");showLogin();$("loginMessage").textContent=err.message||"Falha no login. Confira o PIN e tente novamente."; }finally{submit.disabled=false;submit.textContent="Acessar minha agenda";}});
$("logout").addEventListener("click",()=>{sessionStorage.removeItem("arruda_staff_pin");pin="";barber="";$("staffPin").value="";showLogin();$("loginMessage").textContent="Você saiu da sua agenda.";});
$("refresh").addEventListener("click",load);
const VAPID_PUBLIC_KEY="BAcudFBcLVAWw4m04KoijgcdeQEP7J0oAuYL4B531z3s1-9KTWuaKYO9AcqhGoEMDvh5n8dHYy_RRLLHnM-xoMY";
function base64UrlToBytes(value){const padding="=".repeat((4-value.length%4)%4);const raw=atob((value+padding).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
const testButton=$("testNotifications");
if(testButton){
 testButton.addEventListener("click",async()=>{
  testButton.disabled=true;testButton.textContent="Enviando teste...";
  try{
   const result=await api("test-push");
   $("agendaMessage").textContent=result.sent>0?"Notificação de teste enviada ao seu celular! Confira a tela bloqueada e a Central de Notificações.":"O servidor não confirmou o envio.";
   testButton.textContent="✓ Teste enviado";
  }catch(e){
   $("agendaMessage").textContent=(e.message||"Não foi possível enviar a notificação de teste.")+(e.details?.length?" Detalhes: "+e.details.map(x=>"HTTP "+x.status+" "+x.message).join(" | "):"");
   testButton.disabled=false;testButton.textContent="📲 Enviar notificação de teste";
  }
 });
}
async function restoreSavedPush(){
 try{
  if(!notifyButton || !pin || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if(Notification.permission!=="granted"){notifyButton.textContent="🔔 Ativar notificações de novos agendamentos";return;}
  const registration=await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  if(subscription){const oldKey=subscription.options.applicationServerKey?new Uint8Array(subscription.options.applicationServerKey):null;const newKey=base64UrlToBytes(VAPID_PUBLIC_KEY);if(!oldKey||oldKey.length!==newKey.length||!oldKey.every((v,i)=>v===newKey[i])){await subscription.unsubscribe();subscription=null;}}
  if(subscription){
   await api("subscribe-staff",{subscription:subscription.toJSON()});
   notifyButton.textContent="✓ Notificações ativadas neste aparelho";
   notifyButton.disabled=false;
   $("agendaMessage").textContent="Notificações restauradas e sincronizadas para este aparelho.";
  }else{
   notifyButton.textContent="🔔 Ativar notificações de novos agendamentos";
  }
 }catch(e){console.warn("Reconciliação da inscrição push:",e);}
}
const notifyButton=$("enableNotifications");
if(notifyButton){
 notifyButton.addEventListener("click",async()=>{
  notifyButton.disabled=true;notifyButton.textContent="Ativando notificações...";
  try{
   if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))throw new Error("Este navegador não oferece notificações push. No iPhone, adicione o site à Tela de Início e abra pelo ícone.");
   const permission=await Notification.requestPermission();
   if(permission!=="granted")throw new Error("Permissão de notificação não concedida.");
   const registration=await navigator.serviceWorker.register("./sw.js");
   await navigator.serviceWorker.ready;
   let subscription=await registration.pushManager.getSubscription();
   if(subscription){const oldKey=subscription.options.applicationServerKey;const newKey=base64UrlToBytes(VAPID_PUBLIC_KEY);if(!oldKey||oldKey.length!==newKey.length||!oldKey.every((v,i)=>v===newKey[i])){await subscription.unsubscribe();subscription=null;}}
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToBytes(VAPID_PUBLIC_KEY)});
   await api("subscribe-staff",{subscription:subscription.toJSON()});
   notifyButton.textContent="Notificações ativadas ✓";
   $("agendaMessage").textContent="Este celular receberá alertas de novos agendamentos, mesmo com a agenda fechada.";
  }catch(e){$("agendaMessage").textContent=e.message||"Não foi possível ativar notificações neste navegador.";notifyButton.disabled=false;notifyButton.textContent="🔔 Tentar ativar notificações novamente";}
 });
}
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
if(pin){api().then(d=>{barber=d.barber;showAgenda();load();restoreSavedPush();startPolling();}).catch(()=>{sessionStorage.removeItem("arruda_staff_pin");pin="";showLogin();});}else showLogin();