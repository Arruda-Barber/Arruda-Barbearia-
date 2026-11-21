const SUPABASE_URL = "https://kduaktloheptwyzynppf.supabase.co";
const SUPABASE_KEY = "sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";
const ADMIN_ID = "3a00229d-a83e-45e0-b02e-162960bcfd67";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
const brl = (n) => Number(n || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let currentUser = null, bookings = [], services = [], movements = [], completedBookingIds = new Set();
const today = new Date();
const dateISO = (d) => { const x = new Date(d.getTime()-d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); };
$("monthFilter").value = dateISO(today).slice(0,7);
$("serviceDate").value = dateISO(today);

function showError(el,msg){el.textContent=msg;el.classList.add("error");}
function showMessage(el,msg,error=false){el.textContent=msg;el.classList.toggle("error",error);}
function monthRange(){const value=$("monthFilter").value||dateISO(new Date()).slice(0,7);const [y,m]=value.split("-").map(Number);return {start:`${y}-${String(m).padStart(2,"0")}-01`,end:dateISO(new Date(y,m,0))};}
let recoveryMode=false;
const panelRedirect=window.location.origin+window.location.pathname;
$("forgotPasswordBtn").addEventListener("click",async()=>{
 const email=$("email").value.trim();
 if(!email){showError($("loginError"),"Informe o e-mail da conta primeiro.");return;}
 showMessage($("loginError"),"Enviando link de recuperação...");
 const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:panelRedirect});
 if(error){showError($("loginError"),"Não foi possível enviar o link. "+error.message);return;}
 showMessage($("loginError"),"Enviamos um link de recuperação para o e-mail cadastrado. Confira também o spam.");
});
$("cancelRecoveryBtn").addEventListener("click",()=>{recoveryMode=false;$("recoveryForm").hidden=true;$("loginForm").hidden=false;$("forgotPasswordBtn").hidden=false;$("recoveryMessage").textContent="";});
$("recoveryForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const p=$("newPassword").value, confirm=$("confirmPassword").value;
 if(p.length<8){showError($("recoveryMessage"),"Use pelo menos 8 caracteres.");return;}
 if(p!==confirm){showError($("recoveryMessage"),"As senhas não coincidem.");return;}
 showMessage($("recoveryMessage"),"Atualizando senha...");
 const {error}=await db.auth.updateUser({password:p});
 if(error){showError($("recoveryMessage"),"Não foi possível atualizar: "+error.message);return;}
 recoveryMode=false;$("recoveryForm").hidden=true;$("loginForm").hidden=false;$("forgotPasswordBtn").hidden=false;
 $("password").value=p;showMessage($("loginError"),"Senha atualizada. Entrando...");
 await guardSession();
});
async function guardSession(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){$("loginView").hidden=false;$("appView").hidden=true;return;}
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||user.id!==ADMIN_ID){await db.auth.signOut();$("loginView").hidden=false;$("appView").hidden=true;showError($("loginError"),"Esta conta não tem permissão para acessar o painel.");return;}
 currentUser=user;$("loginView").hidden=true;$("appView").hidden=false;await loadAll();
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="Verificando acesso...";const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){showError($("loginError"),"Falha no login: "+error.message);return;}await guardSession();});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();currentUser=null;await guardSession();});
db.auth.onAuthStateChange((event)=>{
 if(event==="PASSWORD_RECOVERY"){
  recoveryMode=true;$("loginView").hidden=false;$("appView").hidden=true;
  $("loginForm").hidden=true;$("forgotPasswordBtn").hidden=true;$("recoveryForm").hidden=false;
  return;
 }
 if(!recoveryMode)setTimeout(()=>guardSession(),0);
});
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));document.querySelectorAll(".tab-panel").forEach(p=>p.hidden=p.id!==btn.dataset.tab);}));
$("monthFilter").addEventListener("change",loadAll);
async function loadAll(){
 const {start,end}=monthRange();
 const [b,s,m,done]=await Promise.all([
  db.from("barber_bookings").select("id,client_name,service,barber,booking_date,start_time,status").gte("booking_date",dateISO(new Date())).order("booking_date").order("start_time").limit(100),
  db.from("service_records").select("*").gte("service_date",start).lte("service_date",end).order("service_date",{ascending:false}),
  db.from("movements").select("*").gte("created_at",start+"T00:00:00").lte("created_at",end+"T23:59:59").order("created_at",{ascending:false}),
  db.from("service_records").select("booking_id").not("booking_id","is",null)
 ]);
 if(b.error||s.error||m.error||done.error){console.error(b.error,s.error,m.error,done.error);alert("Erro ao carregar dados. Confira as permissões do banco.");return;}
 bookings=b.data||[];services=s.data||[];movements=m.data||[];
 completedBookingIds=new Set((done.data||[]).map(x=>x.booking_id).filter(Boolean));
 renderAll();
}
function renderAll(){
 const serviceRevenue=services.reduce((a,x)=>a+Number(x.amount),0);
 const otherEntries=movements.filter(x=>x.type==="entrada").reduce((a,x)=>a+Number(x.amount),0);
 const expenses=movements.filter(x=>x.type==="saida").reduce((a,x)=>a+Number(x.amount),0);
 $("totalRevenue").textContent=brl(serviceRevenue);$("totalOtherEntries").textContent=brl(otherEntries);$("totalExpenses").textContent=brl(expenses);$("netBalance").textContent=brl(serviceRevenue+otherEntries-expenses);$("serviceCount").textContent=services.length;
 $("barberStats").innerHTML=["Arruda","Felipe","Thalita"].map(name=>{const items=services.filter(x=>x.barber===name);const total=items.reduce((a,x)=>a+Number(x.amount),0);return `<div class="barber-card"><b>${name}</b><strong>${brl(total)}</strong><small>${items.length} atendimento(s) registrado(s)</small></div>`;}).join("");
 const upcoming=bookings.filter(x=>x.status!=="cancelled"&&!completedBookingIds.has(x.id)).slice(0,12);
 $("upcomingRows").innerHTML=upcoming.length?upcoming.map(x=>`<tr><td>${formatDate(x.booking_date)} ${String(x.start_time).slice(0,5)}</td><td>${esc(x.client_name)}</td><td>${esc(x.service)}</td><td>${esc(x.barber)}</td><td class="status">${esc(x.status)}</td></tr>`).join(""):`<tr><td colspan="5">Nenhum próximo agendamento.</td></tr>`;
 $("serviceRows").innerHTML=services.length?services.map(x=>`<tr><td>${formatDate(x.service_date)}</td><td>${esc(x.client_name)}<br><small>${esc(x.service)}</small></td><td>${esc(x.barber)}</td><td>${brl(x.amount)}</td></tr>`).join(""):`<tr><td colspan="4">Nenhum atendimento realizado neste mês.</td></tr>`;
 $("movementRows").innerHTML=movements.length?movements.map(x=>`<tr><td>${formatDate(x.created_at.slice(0,10))}</td><td>${esc(x.description)}</td><td>${x.type==="entrada"?"Entrada":"Saída"}</td><td>${brl(x.amount)}</td></tr>`).join(""):`<tr><td colspan="4">Nenhuma movimentação neste mês.</td></tr>`;
 const pending=bookings.filter(x=>(x.status==="confirmed"||x.status==="pending")&&!completedBookingIds.has(x.id));
 $("bookingSelect").innerHTML='<option value="">Atendimento sem agendamento</option>'+pending.map(x=>`<option value="${x.id}" data-name="${esc(x.client_name)}" data-service="${esc(x.service)}" data-barber="${esc(x.barber)}" data-date="${x.booking_date}">${formatDate(x.booking_date)} · ${String(x.start_time).slice(0,5)} · ${esc(x.client_name)} — ${esc(x.barber)}</option>`).join("");
}
$("bookingSelect").addEventListener("change",e=>{const o=e.target.selectedOptions[0];if(!o||!o.value)return;$("clientName").value=o.dataset.name;$("serviceName").value=o.dataset.service;$("serviceBarber").value=o.dataset.barber;$("serviceDate").value=o.dataset.date;});
$("serviceForm").addEventListener("submit",async e=>{e.preventDefault();const msg=$("serviceMessage");showMessage(msg,"Salvando...");const bookingId=$("bookingSelect").value||null;const payload={booking_id:bookingId,client_name:$("clientName").value.trim(),service:$("serviceName").value.trim(),barber:$("serviceBarber").value,service_date:$("serviceDate").value,amount:Number($("serviceAmount").value),payment_method:$("paymentMethod").value,notes:$("serviceNotes").value.trim()||null,created_by:currentUser.id};
 const {error}=await db.from("service_records").insert(payload);if(error){showMessage(msg,error.code==="23505"?"Este agendamento já foi registrado como atendimento.":"Não foi possível salvar o atendimento.",true);return;}
 e.target.reset();$("serviceDate").value=dateISO(new Date());showMessage(msg,"Atendimento registrado com sucesso.");await loadAll();
});
$("movementForm").addEventListener("submit",async e=>{e.preventDefault();const msg=$("movementMessage");showMessage(msg,"Salvando...");const {error}=await db.from("movements").insert({type:$("movementType").value,amount:Number($("movementAmount").value),description:$("movementDescription").value.trim(),barber:$("movementBarber").value,created_by:currentUser.id});if(error){showMessage(msg,"Não foi possível salvar a movimentação.",true);return;}e.target.reset();showMessage(msg,"Movimentação registrada.");await loadAll();});
function formatDate(s){if(!s)return "—";const [y,m,d]=s.slice(0,10).split("-");return d+"/"+m+"/"+y;}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
guardSession();