import {mountGame as mountSource} from './src/engine/game.js';
export function mountGame(container,options={}){return mountSource(container,{...options,roomsEnabled:false});}
