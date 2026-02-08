class Plugin {
    constructor(workspace) {
        this.workspace = workspace;
        this.containerId = 'vscode-debug-container';
        this.activePluginId = null;
        this.activeFile = null;
        this.activeSideTab = 'explorer'; // 'explorer' or 'search'
        this.collapsedFolders = new Set();
        this.logs = [
            { type: 'info', message: 'VSCode Debug Console v1.2.0 initialized.' }
        ];
        this.pluginManager = workspace.pluginManager;
    }

    async onload() {
        this.createUI();
    }

    async onunload() {
        const container = document.getElementById(this.containerId);
        if (container) container.remove();
        const launcher = document.getElementById('debug-launcher');
        if (launcher) launcher.remove();
    }

    createUI() {
        const container = document.createElement('div');
        container.id = this.containerId;
        container.className = 'fixed inset-0 z-[1000] hidden flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'debug-launcher';
        toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.83-4"/><path d="M21 5c0 2.1-1.6 3.8-3.53 4"/><path d="M22 13h-4"/><path d="M17.17 17c2.13.1 3.83 1.9 3.83 4"/></svg> Debug Console';
        toggleBtn.className = 'fixed bottom-4 right-4 z-[1001] bg-[#007acc] text-white px-4 py-2 rounded shadow-lg font-medium text-xs flex items-center gap-2 hover:bg-[#0062a3] transition-all';
        toggleBtn.onclick = () => this.togglePanel();

        const panel = document.createElement('div');
        panel.className = 'w-full h-full max-w-[1200px] max-h-[800px] bg-[#1e1e1e] text-[#cccccc] flex flex-col rounded-lg shadow-2xl overflow-hidden border border-[#3c3c3c] font-sans';
        panel.innerHTML = `
            <div class="flex flex-1 overflow-hidden">
                <!-- Activity Bar -->
                <div class="w-12 bg-[#333333] flex flex-col items-center py-4 gap-4 border-r border-[#252526]">
                    <div id="btn-tab-explorer" class="p-2 text-white cursor-pointer transition-opacity" title="Explorer"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg></div>
                    <div id="btn-tab-search" class="p-2 text-[#858585] cursor-pointer hover:text-white transition-opacity" title="Marketplace"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                </div>

                <!-- Side Bar -->
                <div class="w-64 bg-[#252526] flex flex-col border-r border-[#3c3c3c]">
                    <div id="sidebar-explorer" class="flex flex-col h-full">
                        <div class="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#bbbbbb] flex justify-between items-center">
                            <span>Explorer</span>
                            <div class="flex items-center gap-2">
                                <button id="add-plugin-btn" title="New Plugin" class="p-1 hover:bg-[#37373d] rounded text-[#bbbbbb] hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3"/><path d="M16 19h6"/><path d="M19 16v6"/></svg></button>
                                <button id="close-debug-panel" title="Close Panel" class="p-1 hover:bg-[#37373d] rounded text-[#bbbbbb] hover:text-white">✕</button>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto">
                            <div class="px-4 py-1 text-[11px] font-bold text-[#bbbbbb] flex items-center gap-1 bg-[#37373d]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg> INSTALLED PLUGINS
                            </div>
                            <div id="plugin-tree" class="py-1"></div>
                        </div>
                    </div>
                    <div id="sidebar-search" class="hidden flex flex-col h-full">
                        <div class="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#bbbbbb]">Marketplace</div>
                        <div class="p-4 space-y-2">
                            <input id="market-search-input" type="text" placeholder="Search GitHub plugins..." class="w-full bg-[#3c3c3c] border border-[#3c3c3c] text-[12px] px-2 py-1 outline-none focus:border-[#007acc]">
                        </div>
                        <div id="market-results" class="flex-1 overflow-y-auto px-4 text-[11px] space-y-2">
                            <div class="text-[#858585] py-2">Search for plugins with topic 'edbp-plugin'</div>
                        </div>
                    </div>
                </div>

                <!-- Main Area -->
                <div class="flex-1 flex flex-col bg-[#1e1e1e]">
                    <div id="editor-tabs" class="flex bg-[#252526] overflow-x-auto h-9"></div>
                    <div id="editor-breadcrumbs" class="px-4 py-1 text-[11px] text-[#888888] flex items-center gap-2 bg-[#1e1e1e]">
                        <span>plugins</span> <span class="text-[10px]">/</span> <span id="current-path">none</span>
                    </div>
                    <div class="flex-1 flex flex-col overflow-hidden">
                        <div id="editor-main" class="flex-1 relative flex flex-col overflow-hidden border-b border-[#3c3c3c]">
                            <div id="empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-[#555555]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="opacity-10 mb-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                                <p class="text-sm">Select a file to view its content</p>
                            </div>
                            <div id="editor-container" class="hidden flex-1 flex flex-col">
                                <textarea id="code-textarea" class="flex-1 bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm outline-none border-none resize-none leading-relaxed" spellcheck="false"></textarea>
                            </div>
                        </div>
                        <div class="h-48 flex flex-col bg-[#1e1e1e]">
                            <div class="px-4 py-1 bg-[#252526] border-b border-[#3c3c3c] text-[11px] font-bold text-[#bbbbbb] flex items-center gap-4">
                                <span class="border-b border-white text-white py-1 cursor-pointer">OUTPUT</span>
                            </div>
                            <div id="console-output" class="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-0.5 selection:bg-[#264f78]"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="h-6 bg-[#007acc] text-white flex items-center px-3 text-[11px] justify-between">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/></svg> Debug Mode</div>
                    <div id="status-uuid" class="opacity-80">UUID: none</div>
                </div>
                <div class="flex items-center gap-4">
                    <div id="save-indicator" class="hidden flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-white"></span> Unsaved Changes</div>
                    <div>UTF-8</div>
                    <div id="status-lang">Plain Text</div>
                </div>
            </div>
        `;

        container.appendChild(panel);
        document.body.appendChild(container);
        document.body.appendChild(toggleBtn);

        this.setupEventListeners();
        this.renderPluginTree();
        this.renderLogs();
    }

    setupEventListeners() {
        document.getElementById('close-debug-panel').onclick = () => this.togglePanel();
        document.getElementById('add-plugin-btn').onclick = () => this.createNewPlugin();
        
        document.getElementById('btn-tab-explorer').onclick = () => this.switchSideTab('explorer');
        document.getElementById('btn-tab-search').onclick = () => this.switchSideTab('search');
        
        const marketInput = document.getElementById('market-search-input');
        marketInput.oninput = (e) => this.searchMarketplace(e.target.value);

        const textarea = document.getElementById('code-textarea');
        textarea.oninput = () => document.getElementById('save-indicator').classList.remove('hidden');
        textarea.onkeydown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveActiveFile();
            }
        };
    }

    togglePanel() {
        const container = document.getElementById(this.containerId);
        container.classList.toggle('hidden');
        if (!container.classList.contains('hidden')) {
            this.renderPluginTree();
            this.renderLogs();
        }
    }

    switchSideTab(tab) {
        this.activeSideTab = tab;
        const exp = document.getElementById('sidebar-explorer');
        const search = document.getElementById('sidebar-search');
        const btnExp = document.getElementById('btn-tab-explorer');
        const btnSearch = document.getElementById('btn-tab-search');

        if (tab === 'explorer') {
            exp.classList.remove('hidden');
            search.classList.add('hidden');
            btnExp.classList.replace('text-[#858585]', 'text-white');
            btnSearch.classList.replace('text-white', 'text-[#858585]');
        } else {
            exp.classList.add('hidden');
            search.classList.remove('hidden');
            btnExp.classList.replace('text-white', 'text-[#858585]');
            btnSearch.classList.replace('text-[#858585]', 'text-white');
            this.searchMarketplace("");
        }
    }

    async searchMarketplace(query) {
        const resultsContainer = document.getElementById('market-results');
        resultsContainer.innerHTML = '<div class="text-[#858585] py-2">Searching...</div>';
        
        try {
            const results = await this.pluginManager.searchGitHub(query);
            resultsContainer.innerHTML = '';
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="text-[#858585] py-2">No plugins found.</div>';
                return;
            }

            results.forEach(repo => {
                const item = document.createElement('div');
                item.className = 'p-3 border-b border-[#3c3c3c] hover:bg-[#2a2d2e] cursor-pointer transition-colors group';
                item.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[#4fc1ff] font-bold truncate">${repo.name}</span>
                        <button class="install-btn opacity-0 group-hover:opacity-100 bg-[#007acc] text-white px-2 py-0.5 rounded text-[10px]" data-url="${repo.html_url}">Install</button>
                    </div>
                    <div class="text-[10px] text-[#858585] mb-1">by ${repo.owner.login}</div>
                    <div class="text-[11px] text-[#bbbbbb] line-clamp-2">${repo.description || 'No description'}</div>
                `;
                item.querySelector('.install-btn').onclick = (e) => {
                    e.stopPropagation();
                    this.installPlugin(repo.html_url);
                };
                resultsContainer.appendChild(item);
            });
        } catch (err) {
            resultsContainer.innerHTML = `<div class="text-red-400 py-2">Error: ${err.message}</div>`;
        }
    }

    async installPlugin(url) {
        this.addLog(`Installing plugin from ${url}...`, 'info');
        try {
            await this.pluginManager.installFromGitHub(url);
            this.addLog(`Plugin installed successfully.`, 'info');
            this.renderPluginTree();
        } catch (err) {
            this.addLog(`Installation failed: ${err.message}`, 'error');
        }
    }

    addLog(message, type = 'info') {
        this.logs.push({ type, message, time: new Date().toLocaleTimeString() });
        this.renderLogs();
    }

    renderLogs() {
        const output = document.getElementById('console-output');
        if (!output) return;
        output.innerHTML = this.logs.map(log => `
            <div class="flex gap-2 ${log.type === 'error' ? 'text-red-400' : 'text-[#cccccc]'}">
                <span class="opacity-40">[${log.time || ''}]</span>
                <span>${log.message}</span>
            </div>
        `).join('');
        output.scrollTop = output.scrollHeight;
    }

    renderPluginTree() {
        const tree = document.getElementById('plugin-tree');
        if (!tree) return;
        tree.innerHTML = '';

        this.pluginManager.plugins.forEach(plugin => {
            const isCollapsed = this.collapsedFolders.has(plugin.uuid);
            const folder = document.createElement('div');
            folder.className = 'flex flex-col';
            
            const header = document.createElement('div');
            header.className = 'px-4 py-1 text-[13px] flex items-center gap-2 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] transition-colors';
            header.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${isCollapsed ? '-90deg' : '0deg'})"><path d="m6 9 6 6 6-6"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dcb67a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                <span class="truncate font-medium">${plugin.name}</span>
            `;
            header.onclick = () => {
                if (this.collapsedFolders.has(plugin.uuid)) this.collapsedFolders.delete(plugin.uuid);
                else this.collapsedFolders.add(plugin.uuid);
                this.renderPluginTree();
            };
            
            const fileContainer = document.createElement('div');
            fileContainer.className = isCollapsed ? 'hidden' : 'flex flex-col';
            fileContainer.appendChild(this.createFileItem(plugin, 'manifest.json', 'manifest', '#cbcb41'));
            fileContainer.appendChild(this.createFileItem(plugin, 'plugin.js', 'script', '#f1e05a'));

            folder.appendChild(header);
            folder.appendChild(fileContainer);
            tree.appendChild(folder);
        });
    }

    createFileItem(plugin, filename, type, color) {
        const item = document.createElement('div');
        const isActive = this.activePluginId === plugin.uuid && this.activeFile === type;
        item.className = `px-10 py-1 text-[13px] flex items-center gap-2 cursor-pointer hover:bg-[#2a2d2e] transition-colors ${isActive ? 'bg-[#37373d] text-white' : 'text-[#cccccc]'}`;
        item.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            <span class="truncate">${filename}</span>
        `;
        item.onclick = (e) => { e.stopPropagation(); this.openFile(plugin.uuid, type); };
        return item;
    }

    openFile(uuid, type) {
        this.activePluginId = uuid;
        this.activeFile = type;
        const plugin = this.pluginManager.plugins.find(p => p.uuid === uuid);
        if (!plugin) return;

        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('editor-container').classList.remove('hidden');
        
        const filename = type === 'manifest' ? 'manifest.json' : 'plugin.js';
        document.getElementById('current-path').textContent = `${plugin.name} / ${filename}`;
        document.getElementById('status-uuid').textContent = `UUID: ${plugin.uuid}`;
        document.getElementById('status-lang').textContent = type === 'manifest' ? 'JSON' : 'JavaScript';
        
        let content = '';
        if (type === 'manifest') {
            const { code, ...manifest } = plugin;
            content = JSON.stringify(manifest, null, 4);
        } else {
            content = plugin.code || '// No code content';
        }
        
        document.getElementById('code-textarea').value = content;
        document.getElementById('save-indicator').classList.add('hidden');
        this.renderPluginTree();
    }

    async saveActiveFile() {
        if (!this.activePluginId || !this.activeFile) return;
        const plugin = this.pluginManager.plugins.find(p => p.uuid === this.activePluginId);
        if (!plugin) return;

        const content = document.getElementById('code-textarea').value;
        try {
            if (this.activeFile === 'manifest') {
                const updated = JSON.parse(content);
                Object.assign(plugin, updated);
            } else {
                plugin.code = content;
            }
            this.pluginManager.savePlugins();
            document.getElementById('save-indicator').classList.add('hidden');
            this.addLog(`Saved ${this.activeFile === 'manifest' ? 'manifest.json' : 'plugin.js'} for ${plugin.name}`, 'info');
            this.renderPluginTree();
        } catch (err) {
            this.addLog(`Save failed: ${err.message}`, 'error');
        }
    }

    async createNewPlugin() {
        const name = prompt("Enter Plugin Name:");
        if (!name) return;
        
        const uuid = `edbp-custom-${Date.now()}`;
        const newPlugin = {
            uuid,
            name,
            author: "Local User",
            version: "1.0.0",
            description: "Created via Debug Console",
            isCustom: true,
            affectsBlocks: true,
            affectsStyle: false,
            code: `class Plugin {\n    constructor(workspace) {\n        this.workspace = workspace;\n    }\n    async onload() {\n        console.log("${name} loaded!");\n    }\n    async onunload() {\n        console.log("${name} unloaded!");\n    }\n}`
        };

        this.pluginManager.plugins.push(newPlugin);
        this.pluginManager.savePlugins();
        this.addLog(`Created new plugin: ${name}`, 'info');
        this.renderPluginTree();
    }
}
