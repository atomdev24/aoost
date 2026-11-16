// The wall's editor chrome, lifted verbatim from the original index.html (it has no content of its own:
// menus, tools, panels and canvases that the script in runtime/wall.js drives).
export const wallMarkup = `
    <div class="ps" id="ps">
      <div class="menubar" role="menubar" aria-label="Editor menu">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <div class="menu"><button aria-haspopup="true" aria-expanded="false">File</button>
          <ul hidden role="menu">
            <li><button data-act="new">New wall<span>⌘N</span></button></li>
            <li><hr></li>
            <li><button data-act="save">Export as PNG<span>⌘S</span></button></li>
          </ul></div>
        <div class="menu"><button aria-haspopup="true" aria-expanded="false">Edit</button>
          <ul hidden role="menu">
            <li><button data-act="undo">Undo stroke<span>⌘Z</span></button></li>
            <li><button data-act="clearpaint">Clear paint layer</button></li>
          </ul></div>
        <div class="menu"><button aria-haspopup="true" aria-expanded="false">Image</button>
          <ul hidden role="menu" id="imageMenu"></ul></div>
        <div class="menu"><button aria-haspopup="true" aria-expanded="false">Layer</button>
          <ul hidden role="menu">
            <li><button data-act="addnote">New sticky note<span>N</span></button></li>
            <li><button data-act="delnote">Delete selected note<span>⌫</span></button></li>
          </ul></div>
      </div>

      <div class="optbar" id="optbar">
        <span class="cur" id="curTool"></span>
        <label class="opt" id="optSize" for="size">Size <input id="size" type="range" min="2" max="120" value="18"><output id="sizeOut">18 px</output></label>
        <label class="opt" id="optOp" for="op">Opacity <input id="op" type="range" min="5" max="100" value="100"><output id="opOut">100%</output></label>
        <span class="opt" id="optNote" hidden>Note <span class="notecols" id="noteCols"></span></span>
      </div>

      <div class="docbar"><div class="doctab"><b>the-wall.psd</b><span id="zoomTxt">@ 50% (RGB/8)</span></div></div>

      <div class="work">
        <div class="toolbar" role="toolbar" aria-label="Tools">
          <button class="tool" data-tool="move" aria-label="Move tool" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/></svg><span class="k">V</span></button>
          <button class="tool" data-tool="brush" aria-label="Brush tool" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4.5l5 5L11 18l-5-5z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2 20 2 20s3 .5 5-.5S9 16 9 16"/></svg><span class="k">B</span></button>
          <button class="tool" data-tool="spray" aria-label="Spray can" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="8" height="12" rx="2"/><path d="M11 9V6h4v3"/><path d="M13 3h2"/><circle cx="5" cy="4" r=".6" fill="currentColor"/><circle cx="4" cy="7" r=".6" fill="currentColor"/><circle cx="6.5" cy="6" r=".6" fill="currentColor"/><circle cx="3" cy="10" r=".6" fill="currentColor"/></svg><span class="k">S</span></button>
          <button class="tool" data-tool="marker" aria-label="Marker" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3l6 6-9 9H6v-6z"/><path d="M6 18l-3 3"/><path d="M12 6l6 6"/></svg><span class="k">M</span></button>
          <button class="tool" data-tool="eraser" aria-label="Eraser" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20h12"/><path d="M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19H8z"/><path d="M9 11l5 5"/></svg><span class="k">E</span></button>
          <button class="tool" data-tool="note" aria-label="Sticky note tool" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v11l-5 5H4z"/><path d="M20 15h-5v5"/></svg><span class="k">N</span></button>
          <span class="sep"></span>
          <div class="fgbg"><button class="fg" id="fgBtn" aria-label="Foreground colour"></button><span class="bgc" aria-hidden="true"></span></div>
          <div class="palette" id="palette"></div>
        </div>

        <div class="canvasarea" id="canvasarea">
          <div class="board" id="board">
            <canvas class="bg" id="bg"></canvas>
            <div class="stk-layer" id="stkLayer"></div>
            <canvas class="paint" id="paint" aria-label="Drawing wall. Draw with your finger or mouse."></canvas>
          </div>
        </div>

        <div class="panels">
          <div class="panel"><h4>Layers <span id="layerCount">3</span></h4><ul class="layers" id="layers"></ul></div>
          <div class="panel"><h4>Background <span id="bgHex">#FFFFFF</span></h4><div class="bgs" id="bgTray"><label class="pick" title="Custom colour"><input type="color" id="bgPick" value="#ffffff" aria-label="Custom background colour"><span aria-hidden="true">+</span></label></div></div>
        </div>
      </div>

      <div class="statusbar">
        <span class="left"><span>1080 × 1350 px</span><span id="xy">x — y —</span></span>
        <button class="ui-btn primary" id="save">Export PNG</button>
      </div>
      <div class="ps-toast" id="toast" aria-live="polite"></div>
    </div>
`;
