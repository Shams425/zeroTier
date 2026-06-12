// Initialize the cloud database client
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    global: {
        headers: {
            'x-custom-secret': CONFIG.DB_SECRET
        }
    }
});

const API = {
    isOffline: false,

    /**
     * Pings the database with a 5-second connection limit check
     */
    async testConnection() {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000) // 5 seconds for rapid UI verification
        );

        try {
            // Quick small query execution to test row authentication path rules
            const dbPromise = supabaseClient.from('routers').select('id').limit(1);
            await Promise.race([dbPromise, timeoutPromise]);
            this.isOffline = false;
            return true;
        } catch (err) {
            console.warn("Cloud connection test failed. Reverting options.", err);
            return false;
        }
    },

    /**
     * Pulls list items dynamically depending on active runtime configuration environment
     */
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
            console.error("Database fetch operation failed:", err);
            showToast("Sync Error: Failed to retrieve data lines.", "error");
            return [];
        }
    },

    /**
     * Saves routing metadata details securely
     */
    async save(routerData) {
        if (this.isOffline) {
            const currentRecords = await this.fetchAll();
            currentRecords.push(routerData);
            localStorage.setItem('netkeep_fallback_db', JSON.stringify(currentRecords));
            return true;
        }

        try {
            const { error } = await supabaseClient
                .from('routers')
                .insert([routerData]);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Database write operation failed:", err);
            showToast("Write Error: Sync blocked by server rules.", "error");
            return false;
        }
    },

    /**
     * Deletes configuration element metrics records
     */
    async delete(id) {
        if (this.isOffline) {
            let currentRecords = await this.fetchAll();
            currentRecords = currentRecords.filter(r => r.id !== id);
            localStorage.setItem('netkeep_fallback_db', JSON.stringify(currentRecords));
            return true;
        }

        try {
            const { error } = await supabaseClient
                .from('routers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Deletion failure code trace:", err);
            return false;
        }
    }
};