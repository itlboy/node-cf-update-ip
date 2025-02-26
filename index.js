require('dotenv').config();
const axios = require('axios');

const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4/zones";
const ZONE_ID = process.env.CF_ZONE_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const RECORD_NAME = process.env.CF_RECORD_NAME;

// Lấy IP public từ dịch vụ bên ngoài
async function getPublicIP() {
    try {
        const res = await axios.get('https://api64.ipify.org?format=json');
        return res.data.ip;
    } catch (error) {
        console.error("❌ Lỗi khi lấy IP Public:", error.message);
        return null;
    }
}

// Lấy thông tin bản ghi DNS từ Cloudflare
async function getDNSRecord() {
    try {
        const response = await axios.get(`${CLOUDFLARE_API_URL}/${ZONE_ID}/dns_records`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
            params: { name: RECORD_NAME }
        });

        if (response.data.success && response.data.result.length > 0) {
            return response.data.result[0];
        } else {
            console.error("❌ Không tìm thấy bản ghi DNS!");
            return null;
        }
    } catch (error) {
        console.error("❌ Lỗi khi lấy DNS Record:", error.response?.data || error.message);
        return null;
    }
}

// Cập nhật bản ghi DNS trên Cloudflare
async function updateDNSRecord(recordId, ip) {
    try {
        const response = await axios.put(
            `${CLOUDFLARE_API_URL}/${ZONE_ID}/dns_records/${recordId}`,
            {
                type: "A",
                name: RECORD_NAME,
                content: ip,
                ttl: 120, // 2 phút
                proxied: false
            },
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );

        if (response.data.success) {
            console.log(`✅ Cập nhật thành công IP ${ip} cho ${RECORD_NAME}`);
        } else {
            console.error("❌ Lỗi khi cập nhật DNS:", response.data.errors);
        }
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật DNS:", error.response?.data || error.message);
    }
}

// Hàm chính để cập nhật IP
async function updateIP() {
    console.log("🔄 Đang kiểm tra IP...");
    const ip = await getPublicIP();
    if (!ip) return;

    const record = await getDNSRecord();
    if (!record) return;

    if (record.content !== ip) {
        console.log(`🔄 IP thay đổi từ ${record.content} → ${ip}, cập nhật lên Cloudflare...`);
        await updateDNSRecord(record.id, ip);
    } else {
        console.log(`✅ IP không thay đổi (${ip}), không cần cập nhật.`);
    }
}

// Chạy ngay và lặp lại mỗi 5 phút
updateIP();
setInterval(updateIP, 5 * 60 * 1000);
