class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.containerId = 'debug-plugin-container';
    }

    async onload() {
        console.log('Debug & Internal Editor Plugin loaded');
        this.createUI();
    }

    createUI() {
        // UIコンテナの作成
        const container = document.createElement('div');
        container.id = this.containerId;
        container.className = 'fixed bottom-4 right-4 z-[200] flex flex-col gap-2';
        
        // メインボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = '🛠️ Debug';
        toggleBtn.className = 'bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-slate-700 transition-all';
        toggleBtn.onclick = () => this.togglePanel();
        
        // パネル
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.className = 'hidden w-[500px] h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden';
        panel.innerHTML = `
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span class="font-bold text-sm">Debug & Internal Editor</span>
                <button id="debug-panel-close" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div class="flex border-b border-slate-100 dark:border-slate-800">
                <button id="tab-editor" class="flex-1 py-2 text-xs font-bold border-b-2 border-indigo-500 text-indigo-500">Editor</button>
                <button id="tab-logs" class="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600">System Logs</button>
                <button id="tab-glossary" class="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600">Glossary</button>
            </div>
            <div id="debug-content" class="flex-1 overflow-hidden flex flex-col p-4">
                <!-- Content will be injected here -->
            </div>
        `;

        container.appendChild(panel);
        container.appendChild(toggleBtn);
        document.body.appendChild(container);

        panel.querySelector('#debug-panel-close').onclick = () => this.togglePanel();
        panel.querySelector('#tab-editor').onclick = () => this.showEditor();
        panel.querySelector('#tab-logs').onclick = () => this.showLogs();
        panel.querySelector('#tab-glossary').onclick = () => this.showGlossary();

        this.showEditor();
    }

    togglePanel() {
        const panel = document.getElementById('debug-panel');
        panel.classList.toggle('hidden');
    }

    updateTabs(activeId) {
        const tabs = ['tab-editor', 'tab-logs', 'tab-glossary'];
        tabs.forEach(id => {
            const el = document.getElementById(id);
            if (id === activeId) {
                el.classList.add('border-b-2', 'border-indigo-500', 'text-indigo-500');
                el.classList.remove('text-slate-400');
            } else {
                el.classList.remove('border-b-2', 'border-indigo-500', 'text-indigo-500');
                el.classList.add('text-slate-400');
            }
        });
    }

    showEditor() {
        this.updateTabs('tab-editor');
        const content = document.getElementById('debug-content');
        content.innerHTML = `
            <p class="text-[11px] text-slate-500 mb-2">プラグインの内部コードをリアルタイムで変更できます（再読み込みで反映）</p>
            <textarea id="internal-editor" class="flex-1 w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 rounded-lg outline-none border border-slate-800 resize-none"></textarea>
            <div class="mt-3 flex gap-2">
                <button id="save-internal" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">Apply Changes</button>
            </div>
        `;
        
        const editor = document.getElementById('internal-editor');
        // 現在のプラグインマネージャーから自身の情報を取得
        const pm = this.workspace.pluginManager;
        if (pm) {
            const myMeta = pm.installedPlugins['debug-editor-plugin'];
            if (myMeta && myMeta.script) {
                editor.value = myMeta.script;
            }
        }

        document.getElementById('save-internal').onclick = () => {
            if (pm) {
                const myMeta = pm.installedPlugins['debug-editor-plugin'];
                if (myMeta) {
                    myMeta.script = editor.value;
                    pm.saveInstalledPlugins();
                    alert('プラグインコードを更新しました。再起動後に反映されます。');
                }
            }
        };
    }

    showLogs() {
        this.updateTabs('tab-logs');
        const content = document.getElementById('debug-content');
        content.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[11px] font-bold text-slate-500">System Error Codes & Status</span>
                    <button id="clear-logs" class="text-[10px] text-red-500 hover:underline">Clear</button>
                </div>
                <div id="log-list" class="flex-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-3 font-mono text-[10px] overflow-y-auto space-y-1">
                    <div class="text-blue-500">[INFO] Workspace initialized.</div>
                    <div class="text-blue-500">[INFO] Plugin Manager ready.</div>
                    <div class="text-amber-500">[WARN] Slow network detected for Blockly CDN.</div>
                    <div class="text-slate-400">[DEBUG] Serializing workspace...</div>
                    <div class="text-emerald-500">[SUCCESS] Auto-save completed.</div>
                </div>
            </div>
        `;
    }

    showGlossary() {
        this.updateTabs('tab-glossary');
        const content = document.getElementById('debug-content');
        content.innerHTML = `
            <div class="space-y-4 overflow-y-auto h-full pr-2">
                <div>
                    <h4 class="text-xs font-bold text-indigo-500 mb-1">UUID (Universally Unique Identifier)</h4>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">プラグインを一意に識別するための128ビットの識別子。CDMでは開発者名とプラグイン名を元に生成されます。</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-indigo-500 mb-1">Serialization</h4>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">ワークスペースの状態（ブロックの配置など）を保存可能なデータ形式（JSON等）に変換すること。</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-indigo-500 mb-1">LZString</h4>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">共有URLを短くするために使用される圧縮アルゴリズム。データをURLセーフな文字列に変換します。</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-indigo-500 mb-1">Flyout</h4>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">Blocklyでツールボックスのカテゴリをクリックした時に横から出てくるブロック一覧パネルのこと。</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-indigo-500 mb-1">Shadow Block</h4>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">削除できないプレースホルダー的なブロック。ユーザーが入力を上書きするためのデフォルト値として機能します。</p>
                </div>
            </div>
        `;
    }

    async onunload() {
        const container = document.getElementById(this.containerId);
        if (container) container.remove();
        console.log('Debug & Internal Editor Plugin unloaded');
    }
}
