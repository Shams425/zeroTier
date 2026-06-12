const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    global: { headers: { 'x-custom-secret': CONFIG.DB_SECRET } }
});

const API = {
    isOffline: false,

    /**
     * Pings the cloud database using a lightweight query with a strict 4-second cutoff.
     * This bypasses the CORS blocking errors completely.
     */
    async testConnection() {
        try {
            // Create a manual 4-second timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 4000)
            );

            // Execute an incredibly tiny RPC or view test that requires almost no overhead
            const dbCheck = supabaseClient.from('routers').select('id').limit(1);

            // Race the network query against our 4-second timer
            await Promise.race([dbCheck, timeout]);

            this.isOffline = false;
            return true;
        } catch (err) {
            console.warn("Connection safety boundary tripped. Defaulting to local storage mode:", err.message);
            this.isOffline = true;
            return false;
        }
    },

    async fetchAll() {
        if (this.isOffline) {
            const localData = localStorage.getItem('netkeep_fallback_db');
            return localData ? JSON.parse(localData) : [];
        }

        try {
            const { data, error } = await supabaseClient
                .from('routers')
                .select('*')
                .order('ownerName', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            this.isOffline = true;
            return JSON.parse(localStorage.getItem('netkeep_fallback_db') || '[]');
        }
    },

    async save(routerData) {
        if (this.isOffline) {
            const currentRecords = await this.fetchAll();
            const existingIndex = currentRecords.findIndex(r => r.id === routerData.id);
            if (existingIndex > -1) {
                currentRecords[existingIndex] = routerData;
            } else {
                currentRecords.push(routerData);
            }
            localStorage.setItem('netkeep_fallback_db', JSON.stringify(currentRecords));
            return true;
        }

        try {
            const { error } = await supabaseClient
                .from('routers')
                .upsert([routerData]);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Write error output:", err);
            return false;
        }
    },

    async delete(id) {
        if (this.isOffline) {
            let currentRecords = await this.fetchAll();
            currentRecords = currentRecords.filter(r => r.id !== id);
            localStorage.setItem('netkeep_fallback_db', JSON.stringify(currentRecords));
            return true;
        }

        try {
            const { error } = await supabaseClient.from('routers').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Deletion breakdown trace:", err);
            return false;
        }
    }
};