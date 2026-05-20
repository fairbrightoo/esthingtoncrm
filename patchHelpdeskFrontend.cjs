const fs = require('fs');
const file = 'frontend/src/pages/HelpdeskTickets.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /import \{ MessageCircle, Settings, Plus, Search, Filter, AlertTriangle, CheckCircle, X, ChevronDown \} from 'lucide-react';/,
    `import { MessageCircle, Settings, Plus, Search, Filter, AlertTriangle, CheckCircle, X, ChevronDown, Paperclip } from 'lucide-react';`
);

c = c.replace(
    /const \[newTicket, setNewTicket\] = useState\(\{ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' \}\);/,
    `const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);`
);

c = c.replace(
    /await axios\.post\(`\$\{import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:3000'\}\/api\/tickets`, newTicket, \{([\s\S]*?)\}\);/,
    `const formData = new FormData();
            formData.append('title', newTicket.title);
            formData.append('description', newTicket.description);
            formData.append('priority', newTicket.priority);
            formData.append('category', newTicket.category);
            if (newTicket.leadId) formData.append('leadId', newTicket.leadId);
            if (attachmentFile) formData.append('attachment', attachmentFile);

            await axios.post(\`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tickets\`, formData, {
                headers: { 
                    Authorization: \`Bearer \${token}\`,
                    'Content-Type': 'multipart/form-data'
                }
            });`
);

c = c.replace(
    /setNewTicket\(\{ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' \}\);/,
    `setNewTicket({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
            setAttachmentFile(null);`
);

c = c.replace(
    /<p className="text-xs text-gray-500 truncate mb-1">\{ticket\.description\}<\/p>/,
    `<p className="text-xs text-gray-500 truncate mb-1">{ticket.description}</p>
                                        {ticket.attachmentUrl && (
                                            <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1">
                                                <Paperclip size={12} /> View Attachment
                                            </a>
                                        )}`
);

c = c.replace(
    /<div>\s*<label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description<\/label>[\s\S]*?<\/textarea>\s*<\/div>/,
    `<div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                <textarea required rows={3} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Details about the issue..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Supporting Document (Optional)</label>
                                <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    onChange={e => e.target.files && setAttachmentFile(e.target.files[0])}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>`
);

fs.writeFileSync(file, c);
console.log("Frontend Patched");
