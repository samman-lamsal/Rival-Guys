window.ArenaSystem = class ArenaSystem {
  constructor(scene){
    this.scene=scene; this.root=new THREE.Group(); this.scene.add(this.root); this.mapId='sky'; this.elapsed=0; this.safeRadius=CFG.ARENA_RADIUS;
    this.floorMain=null; this.bridgeSegments=[]; this.tiles=[]; this.sweeper=null; this.sweeperAngle=0; this.sweeperHits={}; this.islands=[]; this.windPhase='idle'; this.windDir=new THREE.Vector3(1,0,0);
    this.buildToken=0; this.visualPropCount=0; this._addBackdrop();
  }
  _mat(color,rough=.7,metal=.05,emissive=0){ return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive:emissive?new THREE.Color(emissive):new THREE.Color(0x000000),emissiveIntensity:emissive?0.35:0}); }
  _mesh(geo,mat,pos){ const m=new THREE.Mesh(geo,mat); if(pos)m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;this.root.add(m);return m; }
  _disc(r,y,color,th=.7){ return this._mesh(new THREE.CylinderGeometry(r,r,th,64),this._mat(color),new THREE.Vector3(0,y-th/2,0)); }
  _ghost(mesh,opacity=.14){ if(!mesh||!mesh.material)return;mesh.material=mesh.material.clone();mesh.material.transparent=true;mesh.material.opacity=opacity;mesh.material.depthWrite=opacity>.03; }
  // Visual floor pieces used to sit exactly coplanar with the collision discs. On some GPUs that
  // caused severe z-fighting: the blue/green/red/yellow surfaces flashed as the camera moved.
  // Keep decorative model tops a few centimetres above the collision surface instead.
  _surfaceBottom(surfaceY,height){ return surfaceY-height+0.045; }
  _addBackdrop(){
    const skyMat=new THREE.MeshBasicMaterial({color:0xbfe9ff,side:THREE.BackSide});
    const dome=new THREE.Mesh(new THREE.SphereGeometry(120,24,16),skyMat); dome.name='backdrop'; this.root.add(dome);
    const cloudMat=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.9});
    for(let i=0;i<18;i++){
      const g=new THREE.Group();g.name='cloud'; const r=32+Math.random()*50,a=Math.random()*Math.PI*2,y=8+Math.random()*18;
      g.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
      for(let j=0;j<3;j++){ const s=new THREE.Mesh(new THREE.SphereGeometry(2.2+Math.random()*2,12,8),cloudMat);s.scale.y=.55;s.position.set((j-1)*2.6,Math.random(),Math.random()*1.8);g.add(s); }
      this.root.add(g);
    }
  }
  clearMap(){
    this.buildToken++;
    for(let i=this.root.children.length-1;i>=0;i--){ const c=this.root.children[i]; if(c.name==='backdrop')continue; this.root.remove(c); }
    this._addCloudsOnly();
    this.bridgeSegments=[];this.tiles=[];this.sweeper=null;this.sweeperHits={};this.islands=[];this.floorMain=null;this.safeRadius=CFG.ARENA_RADIUS;this.visualPropCount=0;
  }
  _addCloudsOnly(){
    const cloudMat=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.88});
    for(let i=0;i<14;i++){
      const g=new THREE.Group();g.name='cloud'; const r=36+Math.random()*42,a=Math.random()*Math.PI*2,y=7+Math.random()*16;g.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
      for(let j=0;j<3;j++){const s=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*1.6,10,7),cloudMat);s.scale.y=.55;s.position.x=(j-1)*2.3;g.add(s);} this.root.add(g);
    }
  }
  async build(mapId){
    this.clearMap(); this.mapId=mapId; this.elapsed=0; this.root.position.set(0,0,0); this.root.rotation.set(0,0,0); this.root.scale.set(1,1,1);
    this.sweeperAngle=0; this.windPhase='idle'; this.windDir.set(1,0,0); this.sweeperHits={}; const token=this.buildToken;
    if(mapId==='sky') this._buildSky();
    else if(mapId==='bridges') this._buildBridges();
    else if(mapId==='towers') this._buildTowers();
    else if(mapId==='sweeper') this._buildSweeper();
    else if(mapId==='crumble') this._buildCrumble();
    else if(mapId==='wind') this._buildWind();
    // Finish all visual model placement before the countdown. This prevents props from popping in
    // or old asynchronous decoration jobs making later rounds look broken.
    await this._decorateAsync(token).catch(e=>console.warn('[Rival Guys] map model decoration error',e));
  }
  _rim(r,y,color){ const geo=new THREE.TorusGeometry(r,.28,8,64);const m=this._mesh(geo,this._mat(color,.45,.15),new THREE.Vector3(0,y+.06,0));m.rotation.x=Math.PI/2;return m; }
  _rimAt(x,z,r,color){ const geo=new THREE.TorusGeometry(r,.22,8,48);const m=this._mesh(geo,this._mat(color),new THREE.Vector3(x,.04,z));m.rotation.x=Math.PI/2;return m; }
  _buildSky(){
    this.floorMain=this._disc(14,0,0x68d8ff,.9); this._rim(13.75,0,0xff4f91); this.safeRadius=14;
    // A flat center marking instead of the old giant solid yellow puck that blocked the camera.
    const centerMark=this._mesh(new THREE.RingGeometry(3.25,4.15,64),new THREE.MeshStandardMaterial({color:0xffe36b,roughness:.7,transparent:true,opacity:.62,depthWrite:false}),new THREE.Vector3(0,.075,0));
    centerMark.rotation.x=-Math.PI/2;centerMark.receiveShadow=false;
  }
  _buildBridges(){
    this._disc(6.5,0,0x7ed957,.75); this._rim(6.25,0,0xffffff);
    const dirs=[0,Math.PI*2/3,Math.PI*4/3];
    dirs.forEach((a,bi)=>{
      const cx=Math.cos(a)*13,cz=Math.sin(a)*13; const d=this._disc(4.5,0,bi===0?0xffd65a:bi===1?0x60d9ff:0xff78bf,.75);d.position.x=cx;d.position.z=cz; this._rimAt(cx,cz,4.25,bi===0?0xff9850:0xffffff);
      for(let s=0;s<4;s++){
        const rr=7.2+s*1.75; const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
        const mesh=this._mesh(new THREE.BoxGeometry(2.7,.55,1.65),this._mat(0xf3f3f3),new THREE.Vector3(x,-.275,z));
        mesh.rotation.y=-a; this.bridgeSegments.push({mesh,angle:a,r0:rr-.9,r1:rr+.9,width:1.35,active:true,dwell:0,respawnAt:0,bridge:bi,segment:s});
      }
    });
  }
  _buildTowers(){
    this._disc(14,0,0x7be495,.75); this._disc(11,2.1,0x62c8ff,.72); this._disc(8,4.2,0xffd65a,.7);
    this._rimAt(0,0,13.7,0xffffff); const r2=this._rimAt(0,0,10.7,0xffffff);r2.position.y=2.14; const r3=this._rimAt(0,0,7.7,0xff8a54);r3.position.y=4.24;
  }
  _buildSweeper(){
    this.floorMain=this._disc(14,0,0x77e0c3,.75); this._rim(13.7,0,0xffd24d);
    const hub=this._mesh(new THREE.CylinderGeometry(1.3,1.3,1.6,24),this._mat(0xff5d6c,.45,.12),new THREE.Vector3(0,.8,0));hub.name='sweeperColliderHub';this._ghost(hub,.08);
    this.sweeper=new THREE.Group(); this.sweeper.name='sweeperVisualRoot';
    const bar=this._mesh(new THREE.BoxGeometry(26,.55,.75),this._mat(0xff4f91,.4,.12),new THREE.Vector3(0,.55,0)); this.root.remove(bar);this._ghost(bar,.025);this.sweeper.add(bar);this.root.add(this.sweeper);
    const capL=new THREE.Mesh(new THREE.SphereGeometry(.65,14,10),this._mat(0xffd65a));capL.position.x=-13;const capR=capL.clone();capR.position.x=13;this.sweeper.add(capL,capR);this._ghost(capL,.05);this._ghost(capR,.05);
  }
  _buildCrumble(){
    const spacing=2.75,size=2.48; let idx=0;
    for(let gx=-4;gx<=4;gx++)for(let gz=-4;gz<=4;gz++){
      const x=gx*spacing,z=gz*spacing;if(Math.hypot(x,z)>12.5)continue;
      const colors=[0xffd45c,0x6edcff,0xff78bd,0x7ddd79]; const mesh=this._mesh(new THREE.BoxGeometry(size,.55,size),this._mat(colors[(gx+gz+20)%4]),new THREE.Vector3(x,-.275,z));
      this.tiles.push({idx:idx++,gx,gz,x,z,size,mesh,active:true,steppedAt:null,respawnAt:0});
    }
  }
  _buildWind(){
    const colors=[0x7ed957,0x65d7ff,0xffcf5b,0xff7dbb,0xa987ff];
    for(let i=0;i<5;i++){
      const a=-Math.PI/2+i*Math.PI*2/5, x=Math.cos(a)*7.2,z=Math.sin(a)*7.2; const mesh=this._discAt(x,z,3.8,0,colors[i]); this._rimAt(x,z,3.55,0xffffff); this.islands.push({x,z,r:3.8,mesh,index:i,angle:a});
    }
  }
  _discAt(x,z,r,y,color){ const m=this._disc(r,y,color,.72);m.position.x=x;m.position.z=z;return m; }

  // ---------- KayKit map model integration ----------
  _path(color,name){ return color==='neutral'?`assets/platformer/neutral/${name}.gltf`:`assets/platformer/${color}/${name}_${color}.gltf`; }
  _prepareObject(obj,fit){
    obj.position.set(0,0,0);obj.rotation.set(0,0,0);obj.scale.set(1,1,1);obj.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
    if(fit){ obj.scale.set(fit[0]/Math.max(size.x,.001),fit[1]/Math.max(size.y,.001),fit[2]/Math.max(size.z,.001)); }
    obj.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(obj);const center=new THREE.Vector3();box.getCenter(center);
    obj.position.set(-center.x,-box.min.y,-center.z);obj.updateMatrixWorld(true);
    obj.traverse(o=>{if(o.isMesh){o.castShadow=!CFG.MOBILE_OPT;o.receiveShadow=!CFG.MOBILE_OPT;o.frustumCulled=true;}});
    return obj;
  }
  async _addProp(path,opts={},token=this.buildToken){
    try{
      // Keep the map silhouette/gameplay props, but cap decorative instances on phones.
      // This lowers draw calls significantly in 8v8 without changing collisions or mechanics.
      if(CFG.MOBILE_OPT&&this.visualPropCount>=58&&!opts.parent)return null;
      const raw=await Models.loadProp(path); if(token!==this.buildToken)return null;
      const obj=this._prepareObject(raw,opts.fit||null),wrap=new THREE.Group();wrap.name='kaykit:'+path.split('/').pop();wrap.add(obj);
      const p=opts.pos||[0,0,0];wrap.position.set(p[0]||0,p[1]||0,p[2]||0);wrap.rotation.y=opts.rotY||0;
      if(opts.rotX)wrap.rotation.x=opts.rotX;if(opts.rotZ)wrap.rotation.z=opts.rotZ;if(opts.scale)wrap.scale.setScalar(opts.scale);
      const parent=opts.parent||this.root;if(token!==this.buildToken)return null;parent.add(wrap);this.visualPropCount++;return wrap;
    }catch(e){ console.warn('[Rival Guys] prop skipped',path,e); return null; }
  }
  _prop(color,name,opts,token){ return this._addProp(this._path(color,name),opts,token); }
  async _skinCollider(mesh,color,name,fit,token,rotY=0){
    const h=fit[1];
    // Lift the visible skin slightly above the hidden gameplay collider. The collider still moves,
    // disappears and respawns with its children, but its own material never competes for depth.
    const p=await this._prop(color,name,{fit,parent:mesh,pos:[0,-h/2+0.035,0],rotY},token);
    if(p&&mesh.material){ mesh.material=mesh.material.clone(); mesh.material.visible=false; }
    return p;
  }
  _ambientPickup(color,name,a,r,y,token,scale=.85){
    return this._prop(color,name,{pos:[Math.cos(a)*r,y,Math.sin(a)*r],rotY:-a,scale},token);
  }
  _undersideSupport(color,a,r,y,token){
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    return this._prop(color,'bracing_large',{pos:[x,y,z],rotY:-a,fit:[2.0,4.2,1.0]},token);
  }
  async _decorateAsync(token){
    const jobs=[];const add=p=>{jobs.push(p);return p;};
    if(this.mapId==='sky'){
      // Actual KayKit platform pieces, arrows, springs, safety barriers, hoops and support structure.
      const cols=['blue','red','green','yellow'];
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2, c=cols[i],x=Math.cos(a)*5.0,z=Math.sin(a)*5.0;
        add(this._prop(c,'platform_arrow_4x4x1',{pos:[x,this._surfaceBottom(0,.28),z],rotY:-a,fit:[4.1,.28,4.1]},token));
        add(this._prop(c,'spring_pad',{pos:[Math.cos(a+.45)*8.4,0,Math.sin(a+.45)*8.4],rotY:-a,fit:[2.2,.48,2.2]},token));
        add(this._prop(c,'barrier_4x1x1',{pos:[Math.cos(a)*11.0,0,Math.sin(a)*11.0],rotY:-a+Math.PI/2,fit:[4.0,1.05,.7]},token));
        add(this._prop(c,'flag_A',{pos:[Math.cos(a+.22)*12.1,0,Math.sin(a+.22)*12.1],rotY:-a,fit:[1.1,3.8,1.1]},token));
        add(this._undersideSupport(c,a,9.3,-4.2,token));
        add(this._prop(c,'hoop',{pos:[Math.cos(a+.78)*12.0,1.1,Math.sin(a+.78)*12.0],rotY:-a-.78,fit:[3.0,3.0,.5]},token));
        add(this._ambientPickup(c,i%2?'diamond':'star',a+.35,7.0,2.3,token,.7));
      }
      add(this._prop('red','arch_wide',{pos:[0,0,-10.3],rotY:Math.PI,fit:[7.2,4.2,1.6]},token));
      add(this._prop('neutral','structure_A',{pos:[0,-6.0,0],fit:[8.5,5.7,8.5]},token));
      add(this._prop('neutral','strut_horizontal',{pos:[0,-2.2,0],fit:[13,.8,1.0]},token));
      add(this._prop('blue','pipe_180_A',{pos:[0,-3.2,0],rotY:.3,fit:[6.5,3.2,2.5]},token));
    } else if(this.mapId==='bridges'){
      const cols=['yellow','blue','red'];
      // Breakable bridge colliders are visually replaced by actual KayKit wood pieces.
      for(const s of this.bridgeSegments) add(this._skinCollider(s.mesh,'neutral','floor_wood_2x6',[2.7,.55,1.65],token));
      for(let bi=0;bi<3;bi++){
        const a=bi*Math.PI*2/3,c=cols[bi],cx=Math.cos(a)*13,cz=Math.sin(a)*13;
        add(this._prop(c,'platform_4x4x1',{pos:[cx-2.0,this._surfaceBottom(0,.42),cz],rotY:-a,fit:[4,.42,4]},token));
        add(this._prop(c,'platform_4x4x1',{pos:[cx+2.0,this._surfaceBottom(0,.42),cz],rotY:-a,fit:[4,.42,4]},token));
        add(this._prop(c,'arch_tall',{pos:[Math.cos(a)*15.4,0,Math.sin(a)*15.4],rotY:-a+Math.PI/2,fit:[4.4,5.2,1.35]},token));
        add(this._prop(c,'signage_arrow_stand',{pos:[Math.cos(a)*5.2,0,Math.sin(a)*5.2],rotY:-a+Math.PI/2,fit:[1.8,2.5,1.2]},token));
        add(this._prop(c,'flag_B',{pos:[cx+Math.cos(a+.9)*2.9,0,cz+Math.sin(a+.9)*2.9],rotY:-a,fit:[1,3.5,1]},token));
        add(this._prop(c,'flag_C',{pos:[cx+Math.cos(a-.9)*2.9,0,cz+Math.sin(a-.9)*2.9],rotY:-a,fit:[1,3.5,1]},token));
        add(this._prop(c,'railing_straight_padded',{pos:[cx+Math.cos(a+Math.PI/2)*3.15,0,cz+Math.sin(a+Math.PI/2)*3.15],rotY:-a,fit:[4.0,1.35,.55]},token));
        add(this._prop(c,'railing_straight_padded',{pos:[cx+Math.cos(a-Math.PI/2)*3.15,0,cz+Math.sin(a-Math.PI/2)*3.15],rotY:-a,fit:[4.0,1.35,.55]},token));
        add(this._prop('neutral',`structure_${['A','B','C'][bi]}`,{pos:[cx,-5.4,cz],rotY:-a,fit:[5.5,5.2,5.5]},token));
        add(this._ambientPickup(c,bi===0?'heart':bi===1?'diamond':'power',a,13,2.6,token,.7));
      }
      add(this._prop('green','platform_decorative_2x2x2',{pos:[0,this._surfaceBottom(0,.7),0],fit:[5,.7,5]},token));
      add(this._prop('neutral','signage_finish_wide',{pos:[0,.05,-5.0],rotY:Math.PI,fit:[6.0,2.3,.8]},token));
    } else if(this.mapId==='towers'){
      const levels=[{r:12.2,y:0,c:'green'},{r:9.2,y:2.1,c:'blue'},{r:6.2,y:4.2,c:'yellow'}];
      levels.forEach((lv,li)=>{
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3+(li*.25),x=Math.cos(a)*lv.r,z=Math.sin(a)*lv.r;
          add(this._prop(lv.c,i%2?'platform_decorative_1x1x1':'platform_2x2x1',{pos:[x,this._surfaceBottom(lv.y,.38),z],rotY:-a,fit:[2.15,.38,2.15]},token));
          if(i%2===0)add(this._prop(lv.c,'railing_corner_padded',{pos:[Math.cos(a+.12)*(lv.r+.65),lv.y,Math.sin(a+.12)*(lv.r+.65)],rotY:-a,fit:[1.8,1.3,1.8]},token));
        }
      });
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;add(this._undersideSupport(i%2?'red':'blue',a,10.4,-3.6,token));
        add(this._prop('neutral','pillar_2x2x8',{pos:[Math.cos(a)*8.7,-5.2,Math.sin(a)*8.7],fit:[1.5,7.0,1.5]},token));
      }
      add(this._prop('yellow','arch_wide',{pos:[0,4.2,-6.0],rotY:Math.PI,fit:[6.0,3.9,1.4]},token));
      // Keep the stacked discs visually clean. The old decorative ramps had no
      // collision and fighters could visibly pass through them, so they are intentionally
      // omitted until matching ramp collision is implemented.
      ['star','diamond','heart','power'].forEach((n,i)=>add(this._ambientPickup(['yellow','blue','red','green'][i],n,i*Math.PI/2+.4,5.3,7.0,token,.72)));
    } else if(this.mapId==='sweeper'){
      const cols=['red','yellow','blue','green'];
      // The moving sweeper is now visibly constructed from KayKit barrier models.
      for(let i=0;i<8;i++){
        const x=-11.55+i*3.3,c=cols[i%4];
        add(this._prop(c,'barrier_4x1x1',{parent:this.sweeper,pos:[x,.2,0],fit:[3.25,.68,.86]},token));
      }
      add(this._prop('red','button_base',{pos:[0,0,0],fit:[3.0,1.45,3.0]},token));
      add(this._prop('yellow','ball',{parent:this.sweeper,pos:[-13,.1,0],fit:[1.4,1.4,1.4]},token));
      add(this._prop('yellow','ball',{parent:this.sweeper,pos:[13,.1,0],fit:[1.4,1.4,1.4]},token));
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,c=cols[i%4],r=i%2?7.2:9.7;
        add(this._prop(c,'platform_arrow_2x2x1',{pos:[Math.cos(a)*r,this._surfaceBottom(0,.26),Math.sin(a)*r],rotY:-a,fit:[2.5,.26,2.5]},token));
        if(i%2===0)add(this._prop(c,'spring_pad',{pos:[Math.cos(a+.2)*11.2,0,Math.sin(a+.2)*11.2],rotY:-a,fit:[2.1,.45,2.1]},token));
      }
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2+.4,c=cols[i];add(this._prop(c,'flag_A',{pos:[Math.cos(a)*12.0,0,Math.sin(a)*12.0],rotY:-a,fit:[1,3.4,1]},token));
        add(this._prop(c,i%2?'bomb_B':'bomb_A',{pos:[Math.cos(a+.45)*9.4,.15,Math.sin(a+.45)*9.4],rotY:-a,fit:[1.2,1.2,1.2]},token));
        add(this._prop(c,'pipe_90_A',{pos:[Math.cos(a)*8.0,-4.0,Math.sin(a)*8.0],rotY:-a,fit:[3.0,3.2,3.0]},token));
      }
      add(this._prop('neutral','structure_B',{pos:[0,-6.2,0],fit:[9.0,6.0,9.0]},token));
    } else if(this.mapId==='crumble'){
      const cols=['yellow','blue','red','green'];
      // Every falling tile is an actual KayKit platform model tied to the gameplay collider.
      for(const t of this.tiles){ const c=cols[(t.gx+t.gz+20)%4];add(this._skinCollider(t.mesh,c,'platform_2x2x1',[t.size,.55,t.size],token)); }
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2,c=cols[i];
        add(this._prop(c,'arch',{pos:[Math.cos(a)*13.4,0,Math.sin(a)*13.4],rotY:-a+Math.PI/2,fit:[3.0,3.8,1.0]},token));
        add(this._prop(c,i%2?'signage_arrows_left':'signage_arrows_right',{pos:[Math.cos(a+.22)*12.8,.1,Math.sin(a+.22)*12.8],rotY:-a,fit:[2.6,1.5,.55]},token));
        add(this._prop(c,'cone',{pos:[Math.cos(a-.28)*12.6,0,Math.sin(a-.28)*12.6],fit:[.8,1.4,.8]},token));
        add(this._undersideSupport(c,a,9.5,-4.4,token));
        add(this._ambientPickup(c,i%2?'diamond':'star',a+.45,10.8,2.4,token,.7));
      }
      for(let i=0;i<4;i++)add(this._prop('neutral','strut_vertical',{pos:[Math.cos(i*Math.PI/2+.78)*7.8,-5.4,Math.sin(i*Math.PI/2+.78)*7.8],fit:[.9,6.0,.9]},token));
    } else if(this.mapId==='wind'){
      const cols=['green','blue','yellow','red','blue'];
      for(const isl of this.islands){
        const c=cols[isl.index],toward=Math.atan2(-isl.z,-isl.x);
        add(this._prop(c,'platform_4x4x1',{pos:[isl.x,this._surfaceBottom(0,.38),isl.z],rotY:-isl.angle,fit:[5.3,.38,5.3]},token));
        add(this._prop(c,'spring_pad',{pos:[isl.x+Math.cos(toward)*2.25,0,isl.z+Math.sin(toward)*2.25],rotY:-toward,fit:[1.9,.45,1.9]},token));
        add(this._prop(c,'signage_arrow_stand',{pos:[isl.x+Math.cos(toward+.8)*2.5,0,isl.z+Math.sin(toward+.8)*2.5],rotY:-toward,fit:[1.4,2.1,1.0]},token));
        add(this._prop(c,'flag_C',{pos:[isl.x+Math.cos(toward-.8)*2.55,0,isl.z+Math.sin(toward-.8)*2.55],rotY:-toward,fit:[.9,3.0,.9]},token));
        add(this._prop(c,'pipe_straight_A',{pos:[isl.x,-4.0,isl.z],rotY:-isl.angle,fit:[1.3,4.6,1.3],rotX:Math.PI/2},token));
        add(this._prop(c,'bracing_medium',{pos:[isl.x,-3.2,isl.z],rotY:-isl.angle,fit:[4.0,3.5,1.0]},token));
        add(this._ambientPickup(c,isl.index%2?'diamond':'star',isl.angle,8.0,2.6,token,.62));
      }
      // Hoops visually bridge the island gaps while remaining non-colliding so jumps are still skill based.
      for(let i=0;i<5;i++){ const a=-Math.PI/2+(i+.5)*Math.PI*2/5,c=cols[i];add(this._prop(c,'hoop_angled',{pos:[Math.cos(a)*5.5,1.0,Math.sin(a)*5.5],rotY:-a,fit:[2.8,2.8,.55]},token)); }
      add(this._prop('neutral','structure_C',{pos:[0,-7.0,0],fit:[8.0,5.5,8.0]},token));
    }
    await Promise.allSettled(jobs);
    if(token===this.buildToken)console.info(`[Rival Guys] ${this.mapId} arena using ${this.visualPropCount} KayKit model instances; ${window.PLATFORMER_ASSET_PATHS?window.PLATFORMER_ASSET_PATHS.length:0} pack models embedded.`);
  }

  getSpawnPoints(count=CFG.FIGHTER_COUNT){
    const pts=[];count=Math.max(2,count|0);
    if(this.mapId==='towers'){for(let i=0;i<count;i++){const a=i*Math.PI*2/count;pts.push(new THREE.Vector3(Math.cos(a)*5.7,4.25,Math.sin(a)*5.7));}return pts;}
    if(this.mapId==='wind'){for(let i=0;i<count;i++){const isl=this.islands[i%this.islands.length],a=(i*2.2)%6.28,r=1.0+(i%3)*.55;pts.push(new THREE.Vector3(isl.x+Math.cos(a)*r,.05,isl.z+Math.sin(a)*r));}return pts;}
    const r=this.mapId==='bridges'?4.6:(count>=16?8.2:7.2);for(let i=0;i<count;i++){const a=i*Math.PI*2/count;pts.push(new THREE.Vector3(Math.cos(a)*r,.05,Math.sin(a)*r));}return pts;
  }
  getGroundHeight(x,z,currentY,fighter=null,prevY=null){
    if(this.mapId==='sky') return Math.hypot(x,z)<=this.safeRadius?0:null;
    if(this.mapId==='sweeper') return Math.hypot(x,z)<=14?0:null;
    if(this.mapId==='bridges'){
      if(Math.hypot(x,z)<=6.5)return 0;
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3,cx=Math.cos(a)*13,cz=Math.sin(a)*13;if(Math.hypot(x-cx,z-cz)<=4.5)return 0;}
      const seg=this._bridgeSegmentAt(x,z);return seg&&seg.active?0:null;
    }
    if(this.mapId==='towers'){
      const r=Math.hypot(x,z),candidates=[];if(r<=8)candidates.push(4.2);if(r<=11)candidates.push(2.1);if(r<=14)candidates.push(0);candidates.sort((a,b)=>b-a);
      const footY=currentY-.8;
      for(const h of candidates){
        // Swept landing prevents a fast falling fighter from tunnelling through a
        // stacked disc and appearing inside its solid side/underside.
        const crossed=prevY!==null&&prevY>=h-.05&&footY<=h+.08;
        if(crossed||h<=currentY+.48)return h;
      }
      return null;
    }
    if(this.mapId==='crumble'){const t=this._tileAt(x,z);return t&&t.active?0:null;}
    if(this.mapId==='wind'){for(const isl of this.islands)if(Math.hypot(x-isl.x,z-isl.z)<=isl.r)return 0;return null;}
    return null;
  }
  _bridgeSegmentAt(x,z){for(const s of this.bridgeSegments){const ca=Math.cos(s.angle),sa=Math.sin(s.angle),along=x*ca+z*sa,side=-x*sa+z*ca;if(along>=s.r0&&along<=s.r1&&Math.abs(side)<=s.width)return s;}return null;}
  _tileAt(x,z){for(const t of this.tiles)if(Math.abs(x-t.x)<=t.size/2&&Math.abs(z-t.z)<=t.size/2)return t;return null;}
  postFighterUpdate(f,dt){if(this.mapId==='wind'&&this.windPhase==='gust'&&f.alive){const out=new THREE.Vector3(f.pos.x,0,f.pos.z);if(out.lengthSq()<.01)out.copy(this.windDir);out.normalize();f.vel.addScaledVector(out,(this.elapsed<60?4.7:6.2)*dt);}}

  // Crossing the final outside edge means there is no lower platform left to recover on.
  // This is intentionally different from getGroundHeight(): on Tumble Towers a fighter
  // may fall from the top disc to the middle/bottom disc and must stay alive while doing so.
  // Only crossing the OUTERMOST playable boundary causes the immediate ring-out.
  isOutsideKillBoundary(x,z,y=0){
    const r=Math.hypot(x,z);
    if(this.mapId==='towers') return r>14.18;
    if(this.mapId==='sky') return r>this.safeRadius+.18;
    if(this.mapId==='sweeper') return r>14.18;
    // These maps have gaps that are deliberately jumpable, so only kill once the fighter
    // has gone beyond the entire arena envelope rather than merely being over empty space.
    if(this.mapId==='bridges') return r>17.72;
    if(this.mapId==='crumble') return r>13.85;
    if(this.mapId==='wind') return r>11.65;
    return false;
  }
  update(dt,elapsed,fighters){
    this.elapsed=elapsed;
    if(this.mapId==='sky'){
      const step=Math.floor(elapsed/30);this.safeRadius=Math.max(8.2,14-step*1.45);if(this.floorMain){const s=this.safeRadius/14;this.floorMain.scale.set(s,1,s);}
    }else if(this.mapId==='bridges'){
      for(const s of this.bridgeSegments){
        if(!s.active){if(elapsed>=s.respawnAt){s.active=true;s.dwell=0;s.mesh.visible=true;s.mesh.position.y=-.275;}continue;}
        const occupied=fighters.some(f=>f.alive&&f.onGround&&Math.abs(f.pos.y)<.6&&this._bridgeSegmentAt(f.pos.x,f.pos.z)===s);if(occupied)s.dwell+=dt;else s.dwell=Math.max(0,s.dwell-dt*.25);const crackDelay=elapsed<60?4.4:3.2;if(s.dwell>=crackDelay){s.active=false;s.respawnAt=elapsed+(elapsed<60?7:10);s.mesh.visible=false;}
      }
    }else if(this.mapId==='sweeper'){
      const speed=(elapsed<60?.58:.72)+Math.floor(elapsed/20)*.14;this.sweeperAngle+=speed*dt;if(this.sweeper)this.sweeper.rotation.y=-this.sweeperAngle;
      const ca=Math.cos(this.sweeperAngle),sa=Math.sin(this.sweeperAngle);fighters.forEach(f=>{if(!f.alive||f.pos.y>1.05)return;const along=f.pos.x*ca+f.pos.z*sa,side=-f.pos.x*sa+f.pos.z*ca;if(Math.abs(along)<13.2&&Math.abs(side)<.72){const last=this.sweeperHits[f.id]||-99;if(elapsed-last>.7){this.sweeperHits[f.id]=elapsed;const dir=new THREE.Vector3(-sa,0,ca).multiplyScalar(side>0?1:-1).add(new THREE.Vector3(f.pos.x,0,f.pos.z).normalize().multiplyScalar(.35)).normalize();f.applyHit(null,dir.multiplyScalar(6.25+speed*1.35),3.0);}}});
    }else if(this.mapId==='crumble'){
      for(const t of this.tiles){
        if(!t.active){if(elapsed>=t.respawnAt){t.active=true;t.steppedAt=null;t.mesh.visible=true;t.mesh.position.y=-.275;}continue;}
        const occupied=fighters.some(f=>f.alive&&f.onGround&&this._tileAt(f.pos.x,f.pos.z)===t);if(occupied&&t.steppedAt===null)t.steppedAt=elapsed;
        if(t.steppedAt!==null){const d=elapsed-t.steppedAt;t.mesh.position.y=-.275-Math.min(.65,d*.12);const crumbleDelay=elapsed<60?3.4:2.2;if(d>=crumbleDelay){t.active=false;t.respawnAt=elapsed+(elapsed<60?5.5:8);t.mesh.visible=false;}}
      }
    }else if(this.mapId==='wind'){
      const cycle=elapsed%25,prev=this.windPhase;this.windPhase=cycle>=22&&cycle<25?'warning':(cycle<3&&elapsed>3?'gust':'idle');
      if(this.windPhase==='warning'&&prev!=='warning'){AudioFX.sfx.horn();UI.showEvent('WIND IN 3!');}
      if(this.windPhase==='gust'&&prev!=='gust'){const a=Math.random()*Math.PI*2;this.windDir.set(Math.cos(a),0,Math.sin(a));UI.showEvent('WIND GUST!');}
    }
  }
  getSafetyRadius(){return this.mapId==='sky'?this.safeRadius:14;}
  edgeDanger(x,z,y){
    if(this.mapId==='towers'){const r=Math.hypot(x,z),rad=y>3?8:y>1?11:14;return Util.clamp((r-(rad-4))/4,0,1);}
    if(this.mapId==='bridges'){if(Math.hypot(x,z)<5.2)return .1;const seg=this._bridgeSegmentAt(x,z);if(seg)return .6;for(let i=0;i<3;i++){const a=i*Math.PI*2/3,cx=Math.cos(a)*13,cz=Math.sin(a)*13,d=Math.hypot(x-cx,z-cz);if(d<4.5)return Util.clamp((d-2.5)/2,0,1);}return .9;}
    if(this.mapId==='wind'){let best=99;for(const i of this.islands)best=Math.min(best,Math.hypot(x-i.x,z-i.z)-i.r);return best>0?.95:Util.clamp((best+3.8)/3.8,0,1);}
    const r=Math.hypot(x,z),rad=this.mapId==='sky'?this.safeRadius:13.5;return Util.clamp((r-(rad-4))/4,0,1);
  }
  getSafePoint(pos){if(this.mapId==='wind'){let best=this.islands[0],d=Infinity;for(const i of this.islands){const q=Math.hypot(pos.x-i.x,pos.z-i.z);if(q<d){d=q;best=i;}}return{x:best.x,z:best.z};}return{x:0,z:0};}
  shouldBotJump(self,target){if(this.mapId==='sweeper'){const ca=Math.cos(this.sweeperAngle),sa=Math.sin(this.sweeperAngle),side=Math.abs(-self.pos.x*sa+self.pos.z*ca);return side<2.0;}if(this.mapId==='wind')return Math.random()<.08;if(this.mapId==='bridges')return Math.random()<.035;return false;}
};
