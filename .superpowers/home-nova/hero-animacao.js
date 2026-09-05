
(function(){
  /* ---------- HERO: conversa animada ---------- */
  var chat=document.getElementById('chat'),gcard=document.getElementById('gcard'),clock=document.getElementById('clock');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers=[],tick=null,secs=0;
  function clear(){timers.forEach(clearTimeout);timers=[];if(tick){clearInterval(tick);tick=null;}}
  function after(ms,fn){if(reduce){fn();}else{timers.push(setTimeout(fn,ms));}}
  function el(html){var d=document.createElement('div');d.innerHTML=html;return d.firstElementChild;}
  function pad(n){return (n<10?'0':'')+n;}
  function startClock(){secs=0;clock.textContent='00:00';if(reduce){clock.textContent='00:21';return;}tick=setInterval(function(){secs++;clock.textContent='00:'+pad(secs);if(secs>=21){clearInterval(tick);tick=null;}},100);}
  function publish(){
    var cta=document.getElementById('cta1'); if(!cta||cta.dataset.done) return; cta.dataset.done='1'; cta.style.pointerEvents='none';
    cta.classList.remove('pulse'); chat.appendChild(el('<div class="b out">Publicar no Google<span class="t">23:46</span></div>'));
    startClock();
    after(700,function(){var t=el('<div class="typing"><i></i><i></i><i></i></div>');t.id='typ';chat.appendChild(t);});
    after(2100,function(){var t=document.getElementById('typ');if(t)t.remove();
      chat.appendChild(el('<div class="b in ok"><span class="lbl">Publicada no Google.</span><br>A resposta já aparece no seu perfil, abaixo da avaliação de Mesquita.<span class="t">23:47</span></div>'));
      gcard.classList.add('show');
      chat.scrollTop=chat.scrollHeight;
    });
  }
  function run(){
    clear(); chat.innerHTML=''; gcard.classList.remove('show'); clock.textContent='00:00';
    chat.appendChild(el('<div class="sys">Esta empresa usa um serviço seguro da Meta para gerenciar esta conversa.</div>'));
    after(600,function(){var t=el('<div class="typing"><i></i><i></i><i></i></div>');t.id='typ0';chat.appendChild(t);});
    after(1600,function(){var t=document.getElementById('typ0');if(t)t.remove();
      chat.appendChild(el('<div class="b in btnmsg">Você recebeu uma avaliação nova no seu Perfil da Empresa no Google.<br><br>⭐ Nota: 4 de 5<br>👤 Cliente: Mesquita<br>💬 Comentário: <q>Agência Top de serviços de Sergipe, profissionais muito capacitados.</q><br><br>✍️ Preparamos esta resposta:<br><q>Olá, Mesquita, muito obrigado pelas suas palavras. Fico feliz em saber que tenha tido uma boa experiência com a gente. Noá Digital</q><br><br>Toque no botão abaixo para publicar a resposta no seu perfil.<span class="t">23:46</span><div class="cta1 pulse" id="cta1" role="button" tabindex="0">↩ Publicar no Google</div></div>'));
      var c=document.getElementById('cta1'); c.addEventListener('click',publish); c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')publish();});
      after(9000,publish);
    });
  }
  document.getElementById('replay').addEventListener('click',run);
  run();

  /* ---------- DEMO: fila de avaliações ---------- */
  var reviews=[
    {n:'Mariana Souza',s:2,d:'18 de ago. de 2026',q:'"O atendimento demorou mais do que o esperado e ninguém explicou o que estava acontecendo."',r:'Olá, Mariana,\n\nObrigado por escrever. Sinto muito que o atendimento não tenha sido o que você esperava. Não é assim que a gente quer receber quem vem aqui.\n\nGostaria de entender melhor o que aconteceu. Se puder falar direto com a gente, resolvemos isso com você.\n\nBistrô Horizonte'},
    {n:'Rafael Lima',s:3,d:'21 de ago. de 2026',q:'"Comida boa, mas o prato executivo veio frio e demorou pra chegar."',r:'Olá, Rafael,\n\nObrigado pelo retorno. Prato frio não é o que queremos servir, e a demora também não. Já estamos revisando a saída da cozinha no horário do almoço.\n\nQueremos te receber de novo e acertar dessa vez.\n\nBistrô Horizonte'},
    {n:'Ana Lima',s:5,d:'25 de ago. de 2026',q:'"Prato executivo excelente e atendimento atencioso. Voltarei com certeza."',r:'Olá, Ana,\n\nQue bom ler isso! O prato executivo é o nosso orgulho, e a equipe vai adorar saber que o atendimento marcou.\n\nAté a próxima visita.\n\nBistrô Horizonte'}
  ];
  var i=0,star='<svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';
  function stars(n){var h='';for(var k=1;k<=5;k++){h+=star.replace('<svg','<svg class="'+(k<=n?'on':'')+'"');}return h;}
  var chips=document.getElementById('chips');
  reviews.forEach(function(r,k){var b=document.createElement('button');b.type='button';b.innerHTML=r.n+'<span class="stars">'+stars(r.s)+'</span>';b.addEventListener('click',function(){i=k;show();});chips.appendChild(b);});
  function show(){
    var r=reviews[i];
    document.getElementById('rname').textContent=r.n;document.getElementById('rstars').innerHTML=stars(r.s);
    document.getElementById('rdate').textContent=r.d;document.getElementById('rquote').textContent=r.q;
    document.getElementById('rreply').textContent=r.r;document.getElementById('counter').textContent=(i+1)+' de '+reviews.length;
    Array.prototype.forEach.call(chips.children,function(b,k){b.setAttribute('aria-pressed',k===i?'true':'false');});
  }
  document.getElementById('prev').addEventListener('click',function(){i=(i+reviews.length-1)%reviews.length;show();});
  document.getElementById('next').addEventListener('click',function(){i=(i+1)%reviews.length;show();});
  show();
})();
