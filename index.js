require('dotenv').config();
const axios = require('axios');

const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4/zones";
const { CF_ZONE_ID: ZONE_ID, CF_API_TOKEN: API_TOKEN, CF_RECORD_NAME: RECORD_NAME } = process.env;

// Get public IP
async function getPublicIP() {
    try {
        const res = await axios.get('https://api64.ipify.org?format=json');
        return res.data.ip;
    } catch (error) {
        console.error("❌ Error fetching public IP:", error.message);
        return null;
    }
}

// Get DNS record from Cloudflare
async function getDNSRecord() {
    try {
        const response = await axios.get(`${CLOUDFLARE_API_URL}/${ZONE_ID}/dns_records`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
            params: { name: RECORD_NAME }
        });

        return response.data.success && response.data.result.length > 0 ? response.data.result[0] : null;
    } catch (error) {
        console.error("❌ Error fetching DNS record:", error.response?.data || error.message);
        return null;
    }
}

// Create a new DNS record
async function createDNSRecord(ip) {
    try {
        const response = await axios.post(
            `${CLOUDFLARE_API_URL}/${ZONE_ID}/dns_records`,
            {
                type: "A",
                name: RECORD_NAME,
                content: ip,
                ttl: 120, // 2 minutes
                proxied: false
            },
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );

        if (response.data.success) {
            console.log(`✅ DNS record created successfully: ${ip} for ${RECORD_NAME}`);
        } else {
            console.error("❌ Error creating DNS record:", response.data.errors);
        }
    } catch (error) {
        console.error("❌ Error creating DNS record:", error.response?.data || error.message);
    }
}

// Update an existing DNS record
async function updateDNSRecord(recordId, ip) {
    try {
        const response = await axios.put(
            `${CLOUDFLARE_API_URL}/${ZONE_ID}/dns_records/${recordId}`,
            {
                type: "A",
                name: RECORD_NAME,
                content: ip,
                ttl: 120, // 2 minutes
                proxied: false
            },
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );

        if (response.data.success) {
            console.log(`✅ IP updated successfully: ${ip} for ${RECORD_NAME}`);
        } else {
            console.error("❌ Error updating DNS:", response.data.errors);
        }
    } catch (error) {
        console.error("❌ Error updating DNS:", error.response?.data || error.message);
    }
}

// Main function to update or create DNS record
async function updateIP() {
    console.log("🔄 Checking public IP...");
    const ip = await getPublicIP();
    if (!ip) return;

    console.log(`📌 Current Public IP: ${ip}`);

    const record = await getDNSRecord();

    if (!record) {
        console.log("⚠️ No DNS record found. Creating a new one...");
        await createDNSRecord(ip);
    } else if (record.content !== ip) {
        console.log(`🔄 IP changed from ${record.content} → ${ip}, updating Cloudflare...`);
        await updateDNSRecord(record.id, ip);
    }
}

// Run immediately and repeat every 5 minutes
updateIP();
setInterval(updateIP, 5 * 60 * 1000);