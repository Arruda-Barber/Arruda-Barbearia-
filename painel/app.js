const SUPABASE_URL="https://kduaktloheptwyzynppf.supabase.co";
const SUPABASE_KEY="sb_publishable_avmpjV37mxZihhOW_Ov8Q_YbVWyae4";
const ADMIN_ID="3a00229d-a83e-45e0-b02e-162960bcfd67";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const brl=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateToday=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
const monthNow=()=>dateToday().slice(0,7);
let services=[],movements=[],bookings=[],currentUser=null;
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function rangeFor(month){const [y,m]=month.split("-").map(Number);return {start:month+"-01",end:new Date(y,m,0).toLocaleDateString("en-CA")}}
function setTab(tab){document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));$("tab-"+tab).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));$("pageTitle").textContent=({overview:"Visão geral",services:"Serviços realizados",cash:"Fluxo de caixa",bookings:"Agendamentos"})[tab]}
async function loadData(){
 const [s,m,b]=await Promise.all([
  db.from("service_records").select("*").order("service_date",{ascending:false}).limit(1000),
  db.from("movements").select("*").order("created_at",{ascending:false}).limit(1000),
  db.from("barber_bookings").select("*").order("booking_date",{ascending:false}).limit(1000)
 ]);
 if(s.error)throw s.error;if(m.error)throw m.error;if(b.error)throw b.error;
 services=s.data||[];movements=m.data||[];bookings=b.data||[];
 renderAll();
}
function byMonth(rows,key,month){return rows.filter(x=>String(x[key]||"").slice(0,7)===month)}
function renderAll(){const month=$("monthFilter").value||monthNow();const sm=byMonth(services,"service_date",month);const mm=movements.filter(x=>String(x.created_at||"").slice(0,7)===month);const revenue=sm.reduce((a,x)=>a+Number(x.amount),0);const income=mm.filter(x=>x.type==="entrada").reduce((a,x)=>a+Number(x.amount),0);const expense=mm.filter(x=>x.type==="saida").reduce((a,x)=>a+Number(x.amount),0);
 $("mRevenue").textContent=brl(revenue);$("mCount").textContent=sm.length;$("mIncome").textContent=brl(income);$("mExpense").textContent=brl(expense);$("cashBalance").textContent=brl(revenue+income-expense);$("totalIn").textContent=brl(revenue+income);$("totalOut").textContent=brl(expense);
 $("cashIncome").textContent=brl(income);$("cashExpense").textContent=brl(expense);$("cashNet").textContent=brl(income-expense);
 const barbers=["Arruda","Felipe","Thalita"];const totals=barbers.map(name=>({name,total:sm.filter(x=>x.barber===name).reduce((a,x)=>a+Number(x.amount),0),count:sm.filter(x=>x.barber===name).length}));const max=Math.max(1,...totals.map(x=>x.total));
 $("barberStats").innerHTML=totals.map(x=>'<div class="barber-row"><b>'+x.name+'</b><div class="bar-track"><div class="bar-fill" style="width:'+x.total/max*100+'%"></div></div><div class="barber-value">'+brl(x.total)+' <small>('+x.count+')</small></div></div>').join("");
 $("recentServices").innerHTML=sm.slice(0,6).map(serviceRow).join("")||emptyRow(5,"Nenhum serviço concluído neste mês");
 renderServices();renderMovements();renderBookings();
}
function serviceRow(x){return '<tr><td>'+esc(x.service_date)+'</td><td>'+esc(x.client_name)+'</td><td>'+esc(x.service)+'</td><td>'+esc(x.barber)+'</td><td class="amount">'+brl(x.amount)+'</td></tr>'}
function emptyRow(n,msg){return '<tr><td colspan="'+n+'" style="text-align:center;color:#888;padding:25px">'+msg+'</td></tr>'}
function renderServices(){let month=$("serviceMonth").value||monthNow(),barber=$("serviceBarber").value;let rows=byMonth(services,"service_date",month).filter(x=>!barber||x.barber===barber);$("servicesTable").innerHTML=rows.map(x=>'<tr><td>'+esc(x.service_date)+'</td><td>'+esc(x.client_name)+'</td><td>'+esc(x.service)+'</td><td>'+esc(x.barber)+'</td><td>'+esc(x.payment_method)+'</td><td class="amount">'+brl(x.amount)+'</td></tr>').join("")||emptyRow(6,"Nenhum serviço encontrado")}
function renderMovements(){let month=$("cashMonth").value||monthNow();let rows=movements.filter(x=>String(x.created_at).slice(0,7)===month);$("movementsTable").innerHTML=rows.map(x=>'<tr><td>'+new Date(x.created_at).toLocaleDateString("pt-BR")+'</td><td><span class="pill '+(x.type==="saida"?"cancelled":"")+'">'+(x.type==="saida"?"Despesa":"Entrada")+'</span></td><td>'+esc(x.description)+'</td><td>'+esc(x.barber)+'</td><td class="'+(x.type==="saida"?"":"amount")+'">'+(x.type==="saida"?"− ":"+ ")+brl(x.amount)+'</td></tr>').join("")||emptyRow(5,"Nenhuma movimentação neste mês")}
function renderBookings(){let from=$("bookingDate").value||dateToday(),barber=$("bookingBarber").value;let rows=bookings.filter(x=>x.booking_date>=from&&x.status!=="cancelled"&&(!barber||x.barber===barber));$("bookingsTable").innerHTML=rows.map(x=>{const done=services.some(s=>s.booking_id===x.id);return '<tr><td>'+esc(x.booking_date)+' · '+esc(String(x.start_time).slice(0,5))+'</td><td>'+esc(x.client_name)+'</td><td>'+esc(x.service)+'</td><td>'+esc(x.barber)+'</td><td><span class="pill">'+(done?"Concluído":esc(x.status==="pending"?"Pendente":"Confirmado"))+'</span></td><td>'+(done?'<span class="muted">Registrado</span>':'<button class="action" data-complete="'+x.id+'">Concluir serviço</button>')+'</td></tr>'}).join("")||emptyRow(6,"Nenhum agendamento encontrado")}
async function completeBooking(id){const b=bookings.find(x=>x.id===id);if(!b)return;const defaultPrices={"Corte degradê":35,"Corte infantil":35,"Corte degradê (navalhado)":40,"Corte social":35,"Cabelo e barba":55,"Cabelo, barba e sobrancelha":60,"Corte 2 pentes":25,"Corte 1 pente":20,"Pezinhos":15,"Sobrancelha":10,"Barba":25};const raw=prompt("Valor recebido pelo serviço (R$):",defaultPrices[b.service]||"");if(raw===null)return;const amount=Number(raw.replace(",","."));if(!Number.isFinite(amount)||amount<=0){toast("Informe um valor válido.");return}const method=prompt("Forma de pagamento: Pix, Cartão ou Dinheiro","Pix");if(!method)return;const normalized=method.trim().toLowerCase();const payment=normalized==="pix"?"Pix":normalized==="cartão"||normalized==="cartao"?"Cartão":normalized==="dinheiro"?"Dinheiro":null;if(!payment){toast("Use Pix, Cartão ou Dinheiro.");return}const {error}=await db.from("service_records").insert({booking_id:b.id,client_name:b.client_name,service:b.service,barber:b.barber,service_date:b.booking_date,amount,payment_method:payment,created_by:currentUser.id});if(error){toast(error.message.includes("duplicate")?"Este agendamento já foi registrado.":error.message);return}toast("Serviço concluído e registrado!");await loadData()}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){$("loginError").textContent=error.message;return}if(data.user.id!==ADMIN_ID){await db.auth.signOut();$("loginError").textContent="Esta conta não tem autorização para acessar o painel.";return}currentUser=data.user;$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");try{await loadData()}catch(err){toast("Erro ao carregar dados: "+err.message)}});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.go)));
$("refreshBtn").addEventListener("click",async()=>{try{await loadData();toast("Dados atualizados.")}catch(e){toast(e.message)}});
["monthFilter","serviceMonth","cashMonth"].forEach(id=>$(id).value=monthNow());
$("monthFilter").addEventListener("change",renderAll);$("serviceMonth").addEventListener("change",renderServices);$("serviceBarber").addEventListener("change",renderServices);$("cashMonth").addEventListener("change",renderMovements);$("bookingDate").value=dateToday();$("bookingDate").addEventListener("change",renderBookings);$("bookingBarber").addEventListener("change",renderBookings);
$("movementForm").addEventListener("submit",async e=>{e.preventDefault();const amount=Number($("movAmount").value);if(amount<=0)return;const {error}=await db.from("movements").insert({type:$("movType").value,amount,description:$("movDescription").value.trim(),barber:$("movBarber").value,created_by:currentUser.id});if(error){toast(error.message);return}e.target.reset();$("movBarber").value="Arruda";toast("Lançamento salvo.");await loadData()});
$("bookingsTable").addEventListener("click",e=>{const b=e.target.closest("[data-complete]");if(b)completeBooking(b.dataset.complete)});
$("todayLabel").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
(async()=>{const {data}=await db.auth.getSession();if(data.session){if(data.session.user.id!==ADMIN_ID){await db.auth.signOut();return}currentUser=data.session.user;$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");try{await loadData()}catch(e){toast(e.message)}}})();
