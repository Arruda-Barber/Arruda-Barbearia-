const SUPABASE_URL = "https://kduaktloheptwyzynppf.supabase.co";
const SUPABASE_KEY = "sb_publishable_avmpjV37mxZihhOW_Ov8VQ_YbVWyae4";
const ADMIN_ID = "3a00229d-a83e-45e0-b02e-162960bcfd67";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
const brl = value => (Number(value)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date());
const currentMonth = () => today().slice(0,7);
let services=[], movements=[], bookings=[], currentUser=null, recoveryMode=false;

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");window.setTimeout(()=>el.classList.remove("show"),3000)}
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setMessage(id,message,isError=false){const el=$(id);el.textContent=message;el.classList.toggle("error",isError)}
function showApp(){ $("authView").classList.add("hidden");$("pinView").classList.add("hidden");$("appView").classList.remove("hidden"); }
function showAuth(){ $("appView").classList.add("hidden");$("pinView").classList.add("hidden");$("authView").classList.remove("hidden"); }
function showPin(){ $("authView").classList.add("hidden");$("appView").classList.add("hidden");$("pinView").classList.remove("hidden");$("adminPin").value="";setMessage("pinMessage",""); }
function rangeFor(month){const [year,mon]=month.split("-").map(Number);return {start:month+"-01",end:new Date(year,mon,0).toLocaleDateString("en-CA")}}
function setTab(tab){document.querySelectorAll(".tab").forEach(el=>el.classList.add("hidden"));$("tab-"+tab).classList.remove("hidden");document.querySelectorAll(".nav").forEach(el=>el.classList.toggle("active",el.dataset.tab===tab));$("pageTitle").textContent=({overview:"Visão geral",services:"Serviços realizados",cash:"Fluxo de caixa",bookings:"Agendamentos"})[tab]}

async function acceptSession(user){
  if(!user)return;
  if(user.id!==ADMIN_ID){await db.auth.signOut();showAuth();setMessage("authMessage","Esta conta não tem autorização para acessar o painel.",true);return}
  currentUser=user;showApp();
  try{await loadData()}catch(error){toast("Erro ao carregar dados: "+error.message)}
}
async function loadData(){
  const [s,m,b]=await Promise.all([
    db.from("service_records").select("*").in("barber",["Arruda","Felipe"]).order("service_date",{ascending:false}).limit(1000),
    db.from("movements").select("*").order("created_at",{ascending:false}).limit(1000),
    db.from("barber_bookings").select("*").in("barber",["Arruda","Felipe"]).order("booking_date",{ascending:false}).limit(1000)
  ]);
  if(s.error)throw s.error;if(m.error)throw m.error;if(b.error)throw b.error;
  services=s.data||[];movements=m.data||[];bookings=b.data||[];renderAll();
}
function byMonth(rows,key,month){return rows.filter(row=>String(row[key]||"").slice(0,7)===month)}
function renderAll(){
  const month=$("monthFilter").value||currentMonth(), sm=byMonth(services,"service_date",month), mm=movements.filter(x=>String(x.created_at||"").slice(0,7)===month);
  const revenue=sm.reduce((sum,x)=>sum+Number(x.amount),0), income=mm.filter(x=>x.type==="entrada").reduce((sum,x)=>sum+Number(x.amount),0), expense=mm.filter(x=>x.type==="saida").reduce((sum,x)=>sum+Number(x.amount),0);
  $("mRevenue").textContent=brl(revenue);$("mCount").textContent=sm.length;$("mIncome").textContent=brl(income);$("mExpense").textContent=brl(expense);
  $("cashBalance").textContent=brl(revenue+income-expense);$("totalIn").textContent=brl(revenue+income);$("totalOut").textContent=brl(expense);
  $("cashIncome").textContent=brl(income);$("cashExpense").textContent=brl(expense);$("cashNet").textContent=brl(income-expense);
  const barbers=["Arruda","Felipe"], totals=barbers.map(name=>({name,total:sm.filter(x=>x.barber===name).reduce((sum,x)=>sum+Number(x.amount),0),count:sm.filter(x=>x.barber===name).length})), max=Math.max(1,...totals.map(x=>x.total));
  $("barberStats").innerHTML=totals.map(x=>'<div class="barber-row"><b>'+x.name+'</b><div class="bar-track"><div class="bar-fill" style="width:'+(x.total/max*100)+'%"></div></div><div class="barber-value">'+brl(x.total)+' <small>('+x.count+' serviços)</small></div></div>').join("");
  $("recentServices").innerHTML=sm.slice(0,7).map(serviceRow).join("")||emptyRow(5,"Nenhum serviço concluído neste mês");
  renderServices();renderMovements();renderBookings();
}
function emptyRow(cols,message){return '<tr><td colspan="'+cols+'" style="text-align:center;color:#888;padding:25px">'+esc(message)+'</td></tr>'}
function serviceRow(x){return '<tr><td>'+esc(x.service_date)+'</td><td>'+esc(x.client_name)+'</td><td>'+esc(x.service)+'</td><td>'+esc(x.barber)+'</td><td class="amount">'+brl(x.amount)+'</td></tr>'}
function renderServices(){const month=$("serviceMonth").value||currentMonth(),barber=$("serviceBarber").value,rows=byMonth(services,"service_date",month).filter(x=>!barber||x.barber===barber);$("servicesTable").innerHTML=rows.map(x=>'<tr><td>'+esc(x.service_date)+'</td><td>'+esc(x.client_name)+'</td><td>'+esc(x.service)+'</td><td>'+esc(x.barber)+'</td><td>'+esc(x.payment_method)+'</td><td class="amount">'+brl(x.amount)+'</td></tr>').join("")||emptyRow(6,"Nenhum serviço encontrado")}
function renderMovements(){const month=$("cashMonth").value||currentMonth(),rows=movements.filter(x=>String(x.created_at||"").slice(0,7)===month);$("movementsTable").innerHTML=rows.map(x=>'<tr><td>'+new Date(x.created_at).toLocaleDateString("pt-BR")+'</td><td><span class="pill '+(x.type==="saida"?"cancelled":"")+'">'+(x.type==="saida"?"Despesa":"Entrada")+'</span></td><td>'+esc(x.description)+'</td><td>'+esc(x.barber)+'</td><td class="'+(x.type==="saida"?"":"amount")+'">'+(x.type==="saida"?"− ":"+ ")+brl(x.amount)+'</td></tr>').join("")||emptyRow(5,"Nenhuma movimentação neste mês")}
function renderBookings(){const from=$("bookingDate").value||today(),barber=$("bookingBarber").value,rows=bookings.filter(x=>x.booking_date>=from&&x.status!=="cancelled"&&(!barber||x.barber===barber));$("bookingsTable").innerHTML=rows.map(x=>{const done=services.some(s=>s.booking_id===x.id);return '<tr><td>'+esc(x.booking_date)+' · '+esc(String(x.start_time).slice(0,5))+'</td><td>'+esc(x.client_name)+'</td><td>'+esc(x.service)+'</td><td>'+esc(x.barber)+'</td><td><span class="pill">'+(done?"Concluído":esc(x.status==="pending"?"Pendente":"Confirmado"))+'</span></td><td>'+(done?'<span class="muted">Registrado</span>':'<button class="action" data-complete="'+esc(x.id)+'">Concluir serviço</button>')+'</td></tr>'}).join("")||emptyRow(6,"Nenhum agendamento encontrado")}
async function completeBooking(id){
  const booking=bookings.find(x=>x.id===id);if(!booking)return;
  const prices={"Corte degradê":35,"Corte infantil":35,"Corte degradê (navalhado)":40,"Corte social":35,"Cabelo e barba":55,"Cabelo, barba e sobrancelha":60,"Corte 2 pentes":25,"Corte 1 pente":20,"Pezinhos":15,"Sobrancelha":10,"Barba":25};
  const raw=prompt("Valor recebido pelo serviço (R$):",prices[booking.service]||"");if(raw===null)return;
  const amount=Number(raw.replace(",","."));if(!Number.isFinite(amount)||amount<=0){toast("Informe um valor válido.");return}
  const method=prompt("Forma de pagamento: Pix, Cartão ou Dinheiro","Pix");if(!method)return;
  const normalized=method.trim().toLowerCase(),payment=normalized==="pix"?"Pix":normalized==="cartão"||normalized==="cartao"?"Cartão":normalized==="dinheiro"?"Dinheiro":null;
  if(!payment){toast("Use Pix, Cartão ou Dinheiro.");return}
  const {error}=await db.from("service_records").insert({booking_id:booking.id,client_name:booking.client_name,service:booking.service,barber:booking.barber,service_date:booking.booking_date,amount,payment_method:payment,created_by:currentUser.id});
  if(error){toast(error.message.includes("duplicate")?"Este agendamento já foi registrado.":error.message);return}
  toast("Serviço concluído e registrado!");await loadData();
}

$("googleLoginBtn").addEventListener("click",async()=>{
  setMessage("authMessage","Conectando com o Google...");
  const redirectTo=window.location.origin+window.location.pathname;
  const {error}=await db.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo,queryParams:{prompt:"select_account"}}
  });
  if(error)setMessage("authMessage","Não foi possível iniciar o login com Google: "+error.message,true);
});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();currentUser=null;showAuth()});
$("pinLogoutBtn").addEventListener("click",async()=>{await db.auth.signOut();currentUser=null;showAuth()});
$("pinForm").addEventListener("submit",async event=>{event.preventDefault();const pin=$("adminPin").value.trim();if(!/^\\d{4}$/.test(pin)){setMessage("pinMessage","Digite os 4 números do PIN.",true);return;}const button=event.submitter;button.disabled=true;button.textContent="Verificando...";const {data,error}=await db.functions.invoke("verify-admin-pin",{body:{pin}});button.disabled=false;button.textContent="Acessar painel";if(error){setMessage("pinMessage","Não foi possível validar o PIN. Tente novamente.",true);return;}if(!data?.valid){setMessage("pinMessage","PIN incorreto. Confira e tente novamente.",true);$("adminPin").value="";return;}showApp();try{await loadData()}catch(err){toast("Erro ao carregar dados: "+err.message)}});
document.querySelectorAll(".nav").forEach(button=>button.addEventListener("click",()=>setTab(button.dataset.tab)));
document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>setTab(button.dataset.go)));
$("refreshBtn").addEventListener("click",async()=>{try{await loadData();toast("Dados atualizados.")}catch(error){toast(error.message)}});
["monthFilter","serviceMonth","cashMonth"].forEach(id=>$(id).value=currentMonth());
$("monthFilter").addEventListener("change",renderAll);$("serviceMonth").addEventListener("change",renderServices);$("serviceBarber").addEventListener("change",renderServices);$("cashMonth").addEventListener("change",renderMovements);
$("bookingDate").value=today();$("bookingDate").addEventListener("change",renderBookings);$("bookingBarber").addEventListener("change",renderBookings);
$("movementForm").addEventListener("submit",async event=>{
  event.preventDefault();const amount=Number($("movAmount").value);if(!Number.isFinite(amount)||amount<=0)return;
  const {error}=await db.from("movements").insert({type:$("movType").value,amount,description:$("movDescription").value.trim(),barber:$("movBarber").value,created_by:currentUser.id});
  if(error){toast(error.message);return}
  event.target.reset();$("movBarber").value="Arruda";toast("Lançamento salvo.");await loadData();
});
$("bookingsTable").addEventListener("click",event=>{const button=event.target.closest("[data-complete]");if(button)completeBooking(button.dataset.complete)});
$("todayLabel").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});

db.auth.onAuthStateChange((event,session)=>{
  if(event==="SIGNED_IN"&&session){window.setTimeout(()=>acceptSession(session.user),0)}
  if(event==="SIGNED_OUT"){currentUser=null;showAuth();showLogin()}
});
(async()=>{
  const {data,error}=await db.auth.getSession();
  if(error){setMessage("authMessage","Não foi possível verificar a sessão. Atualize a página.",true);return}
  if(data.session)await acceptSession(data.session.user);
  else if(window.location.hash.includes("error=")){setMessage("authMessage","O login do Google não foi concluído. Confira a configuração do provedor Google no Supabase.",true)}
})();