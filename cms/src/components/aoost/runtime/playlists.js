/* playlists: chips pick a playlist, its disc slides half out of the sleeve, and the tracklist
   plays through Spotify's own embed (the iFrame API). Logged-out visitors get Spotify's previews. */
import { blockData, blockEl, IN_CLAUDE } from './shared.js';

export function initPlaylists(){
const D=blockData('playlists'),root=blockEl('playlists');if(!D||!root)return;
const LISTS=(D.playlists||[]).filter(p=>p&&p.id);if(!LISTS.length)return;
const chips=[...root.querySelectorAll('.pl-chip')],recs=[...root.querySelectorAll('.pl-rec')],lists=[...root.querySelectorAll('.pl-list')];
let cur=0,ctrl=null,pending=null;

function select(i){if(i===cur||!LISTS[i])return;cur=i;
  chips.forEach((c,k)=>c.setAttribute('aria-pressed',k===i));
  /* unhiding restarts the disc's slide-out animation (none with reduced motion) */
  recs.forEach((r,k)=>r.hidden=k!==i);lists.forEach((l,k)=>l.hidden=k!==i);
  pending=null;if(ctrl)ctrl.loadUri('spotify:playlist:'+LISTS[i].id);}
function mark(uri){const l=lists[cur];if(!l)return;l.querySelectorAll('.pl-track').forEach(b=>{if(b.dataset.uri===uri)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});}
function play(uri){mark(uri);if(!ctrl){pending=uri;return;}ctrl.loadUri(uri);ctrl.play();}

chips.forEach((c,k)=>c.addEventListener('click',()=>select(k)));
lists.forEach(l=>l.addEventListener('click',e=>{const b=e.target.closest('button.pl-track');if(b&&b.dataset.uri)play(b.dataset.uri);}));

if(IN_CLAUDE)return;
const host=document.getElementById('spHost');if(!host)return;
const prev=window.onSpotifyIframeApiReady;
window.onSpotifyIframeApiReady=API=>{if(typeof prev==='function')try{prev(API);}catch(e){}
  API.createController(host,{uri:'spotify:playlist:'+LISTS[cur].id,width:'100%',height:80},c=>{ctrl=c;
    if(pending){const u=pending;pending=null;play(u);}
    c.addListener&&c.addListener('playback_update',e=>{const u=e&&e.data&&e.data.playingURI;if(u&&u.startsWith('spotify:track:'))mark(u);});});};
const s=document.createElement('script');s.src='https://open.spotify.com/embed/iframe-api/v1';s.async=true;document.head.appendChild(s);
}
