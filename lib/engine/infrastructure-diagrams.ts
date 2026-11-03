/**
 * Enterprise Network & Systems Infrastructure Diagram Engine
 * 
 * Inspired by lawrencesystems/Draw_IO_Diagrams real-world network architectures:
 * pfSense/Netgate firewalls, VLAN trunking, 10GbE SFP+ backbones, TrueNAS ZFS pools,
 * Proxmox VE hypervisors, and UniFi WiFi networks.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type InfraNodeType = 
  | 'firewall' 
  | 'switch' 
  | 'storage' 
  | 'hypervisor' 
  | 'ap' 
  | 'client' 
  | 'vpn' 
  | 'cloud';

export interface InfraNode {
  id: string;
  name: string;
  role: InfraNodeType;
  ip?: string;
  vlan?: number;
  specs?: string; // e.g. "pfSense Plus 23.09", "TrueNAS SCALE 128TB RAIDZ2", "UniFi U6-Pro"
  x: number; // 0 to 100 percentage or px
  y: number;
}

export interface InfraLink {
  from: string; // node id
  to: string; // node id
  label?: string; // e.g. "10G SFP+ DAC Trunk", "VLAN 20 (Storage)", "WireGuard Tunnel"
  speed?: '10G' | '1G' | '100M' | 'VPN';
  color?: string;
}

export interface InfraDiagramSpec {
  title: string;
  subtitle?: string;
  domain?: string; // e.g. "corp.lawrencesystems.internal"
  subnetRange?: string; // e.g. "192.168.0.0/16"
  nodes: InfraNode[];
  links: InfraLink[];
  theme?: 'lawrence_dark' | 'cyber_terminal' | 'corporate_slate';
}

// ============================================================================
// Curated Real-World Presets (Lawrence Systems Style)
// ============================================================================

export const INFRASTRUCTURE_PRESETS: Record<string, { title: string; description: string; spec: InfraDiagramSpec }> = {
  pfsense_ha_truenas: {
    title: "pfSense HA Firewall & TrueNAS ZFS Storage",
    description: "High-Availability redundant pfSense cluster with 10GbE SFP+ DAC trunks to TrueNAS ZFS pool and Proxmox VE",
    spec: {
      title: "Enterprise HA Perimeter & ZFS Storage Core",
      subtitle: "Lawrence Systems High-Availability Architecture",
      domain: "infra.enterprise.local",
      subnetRange: "10.10.0.0/16",
      theme: "lawrence_dark",
      nodes: [
        { id: "wan", name: "Dual ISP WAN", role: "cloud", ip: "203.0.113.1/30", specs: "BGP Fiber / Coax Failover", x: 50, y: 10 },
        { id: "fw1", name: "pfSense Primary (CARP)", role: "firewall", ip: "10.10.1.1", specs: "Netgate 6100 / CARP VIP", x: 30, y: 25 },
        { id: "fw2", name: "pfSense Secondary", role: "firewall", ip: "10.10.1.2", specs: "Netgate 6100 (Sync State)", x: 70, y: 25 },
        { id: "core_sw", name: "UniFi 10G Core Switch", role: "switch", ip: "10.10.1.10", specs: "USW-Pro-Aggregation 10G SFP+", x: 50, y: 45 },
        { id: "truenas", name: "TrueNAS SCALE ZFS", role: "storage", ip: "10.10.20.50", specs: "128TB RAIDZ2 / NFS & SMB", x: 25, y: 70 },
        { id: "proxmox", name: "Proxmox VE Cluster", role: "hypervisor", ip: "10.10.20.100", specs: "3-Node Ceph & KVM Compute", x: 75, y: 70 },
      ],
      links: [
        { from: "wan", to: "fw1", label: "WAN1 Gigabit", speed: "1G", color: "#38bdf8" },
        { from: "wan", to: "fw2", label: "WAN2 Backup", speed: "1G", color: "#64748b" },
        { from: "fw1", to: "fw2", label: "pfsync / XMLRPC", speed: "1G", color: "#f59e0b" },
        { from: "fw1", to: "core_sw", label: "LACP Trunk (2x10G)", speed: "10G", color: "#10b981" },
        { from: "fw2", to: "core_sw", label: "LACP Trunk (2x10G)", speed: "10G", color: "#10b981" },
        { from: "core_sw", to: "truenas", label: "VLAN 20 (Storage 10G)", speed: "10G", color: "#8b5cf6" },
        { from: "core_sw", to: "proxmox", label: "VLAN 20/30 (VM Network)", speed: "10G", color: "#06b6d4" },
      ],
    },
  },
  vlan_segmentation: {
    title: "VLAN Network Security Segmentation",
    description: "Strict isolation across Trusted LAN, Server DMZ, IoT Quarantined Devices, and Guest WiFi",
    spec: {
      title: "Enterprise VLAN Network Segmentation",
      subtitle: "Zero-Trust Firewall Rules & UniFi APs",
      domain: "secure.corp.local",
      subnetRange: "192.168.0.0/16",
      theme: "corporate_slate",
      nodes: [
        { id: "router", name: "pfSense Security Gateway", role: "firewall", ip: "192.168.1.1", specs: "Snort IDS/IPS + pfBlockerNG", x: 50, y: 15 },
        { id: "switch", name: "24-Port PoE+ Core Switch", role: "switch", ip: "192.168.1.2", specs: "802.1Q 10G Uplink", x: 50, y: 40 },
        { id: "vlan10", name: "VLAN 10: Trusted Workstations", role: "client", ip: "192.168.10.0/24", specs: "Internal Staff & PCs", x: 15, y: 72 },
        { id: "vlan20", name: "VLAN 20: Server DMZ", role: "storage", ip: "192.168.20.0/24", specs: "Web, Mail, Backup Hosts", x: 40, y: 72 },
        { id: "vlan30", name: "VLAN 30: IoT Isolation", role: "client", ip: "192.168.30.0/24", specs: "Cameras & Smart Sensors", x: 65, y: 72 },
        { id: "vlan40", name: "VLAN 40: Guest WiFi (AP)", role: "ap", ip: "192.168.40.0/24", specs: "UniFi U6-Pro Isolated", x: 88, y: 72 },
      ],
      links: [
        { from: "router", to: "switch", label: "Trunk (All VLANs)", speed: "10G", color: "#10b981" },
        { from: "switch", to: "vlan10", label: "VLAN 10 Access", speed: "1G", color: "#3b82f6" },
        { from: "switch", to: "vlan20", label: "VLAN 20 Tagged", speed: "10G", color: "#ec4899" },
        { from: "switch", to: "vlan30", label: "VLAN 30 (Blocked to LAN)", speed: "100M", color: "#f59e0b" },
        { from: "switch", to: "vlan40", label: "VLAN 40 Client Isolation", speed: "1G", color: "#06b6d4" },
      ],
    },
  },
  wireguard_mesh: {
    title: "WireGuard Multi-Site Encrypted Tunnel",
    description: "Site-to-site cryptographic mesh connecting Remote Branch Office to Central Data Center",
    spec: {
      title: "WireGuard Cryptographic Site-to-Site Tunnel",
      subtitle: "ChaCha20-Poly1305 Line-Rate Encrypted VPN",
      domain: "mesh.lawrence.vpn",
      subnetRange: "10.200.0.0/24",
      theme: "cyber_terminal",
      nodes: [
        { id: "branch", name: "Branch Office Gateway", role: "vpn", ip: "10.200.0.2 (wg0)", specs: "Remote Office LAN (192.168.50.0/24)", x: 20, y: 40 },
        { id: "hq", name: "Headquarters pfSense Core", role: "firewall", ip: "10.200.0.1 (wg0)", specs: "Central HQ Datacenter", x: 80, y: 40 },
        { id: "servers", name: "HQ Core Application Servers", role: "hypervisor", ip: "10.0.10.0/24", specs: "Postgres, LDAP, Nextcloud", x: 80, y: 75 },
      ],
      links: [
        { from: "branch", to: "hq", label: "Encrypted WireGuard Peer (UDP 51820)", speed: "VPN", color: "#10b981" },
        { from: "hq", to: "servers", label: "Internal 10G Core", speed: "10G", color: "#38bdf8" },
      ],
    },
  },
};

// ============================================================================
// Node Icons & Styling
// ============================================================================

export function getInfraNodeVisuals(role: InfraNodeType): { icon: string; border: string; bg: string; badge: string } {
  switch (role) {
    case 'firewall':
      return { icon: '🛡️', border: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', badge: 'FIREWALL' };
    case 'switch':
      return { icon: '🔀', border: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', badge: 'CORE SWITCH' };
    case 'storage':
      return { icon: '💽', border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', badge: 'ZFS STORAGE' };
    case 'hypervisor':
      return { icon: '🖥️', border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', badge: 'HYPERVISOR' };
    case 'ap':
      return { icon: '📡', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', badge: 'WIFI AP' };
    case 'vpn':
      return { icon: '🔒', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', badge: 'VPN GATEWAY' };
    case 'cloud':
      return { icon: '☁️', border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', badge: 'WAN ISP' };
    case 'client':
    default:
      return { icon: '💻', border: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', badge: 'ENDPOINT' };
  }
}

// ============================================================================
// HTML5/SVG Motion Graphics Generator
// ============================================================================

/**
 * Generates an animated HTML5 motion graphics page for enterprise infrastructure diagrams
 * with active packet flow animations and Lawrence Systems aesthetics.
 */
export function generateInfrastructureDiagramHtml(spec: InfraDiagramSpec): string {
  const nodeMap = new Map<string, InfraNode>();
  for (const n of spec.nodes) {
    nodeMap.set(n.id, n);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${spec.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0c0f17;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 60px 40px;
      position: relative;
    }
    .header {
      margin-bottom: 40px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 24px;
    }
    .header h1 {
      font-size: 44px;
      font-weight: 800;
      color: #f8fafc;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 20px;
      color: #94a3b8;
    }
    .diagram-stage {
      position: relative;
      flex: 1;
      width: 100%;
      background: #080a0f;
      border: 2px solid rgba(56, 189, 248, 0.2);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }
    .grid-lines {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .node-card {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 220px;
      padding: 16px 20px;
      border-radius: 14px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .node-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .node-icon { font-size: 24px; }
    .node-title { font-size: 16px; font-weight: 700; color: #fff; }
    .node-ip { font-size: 13px; font-family: monospace; color: #38bdf8; }
    .node-specs { font-size: 12px; color: #94a3b8; }
    .node-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      align-self: flex-start;
      margin-top: 4px;
    }
    svg.link-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 5;
    }
    .pulse-packet {
      r: 6;
      fill: #10b981;
      filter: drop-shadow(0 0 8px #10b981);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${spec.title}</h1>
    ${spec.subtitle ? `<p>${spec.subtitle} • Subnet: ${spec.subnetRange || '10.0.0.0/16'}</p>` : ''}
  </div>

  <div class="diagram-stage">
    <div class="grid-lines"></div>

    <!-- SVG Vector Links & Packet Flows -->
    <svg class="link-layer">
      ${spec.links.map((link) => {
        const fromNode = nodeMap.get(link.from);
        const toNode = nodeMap.get(link.to);
        if (!fromNode || !toNode) return '';

        const strokeColor = link.color || '#3b82f6';
        const strokeWidth = link.speed === '10G' ? '4' : '2.5';
        const isDashed = link.speed === 'VPN';

        return `
          <g>
            <line
              x1="${fromNode.x}%"
              y1="${fromNode.y}%"
              x2="${toNode.x}%"
              y2="${toNode.y}%"
              stroke="${strokeColor}"
              stroke-width="${strokeWidth}"
              stroke-dasharray="${isDashed ? '6 4' : 'none'}"
              stroke-opacity="0.8"
            />
            <!-- Flowing Packet Animation -->
            <circle class="pulse-packet" style="fill: ${strokeColor};">
              <animateMotion
                path="M ${fromNode.x * 10},${fromNode.y * 14} L ${toNode.x * 10},${toNode.y * 14}"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        `;
      }).join('')}
    </svg>

    <!-- Node Cards -->
    ${spec.nodes.map((node) => {
      const visual = getInfraNodeVisuals(node.role);
      return `
        <div
          class="node-card"
          style="
            left: ${node.x}%;
            top: ${node.y}%;
            border: 2px solid ${visual.border};
            background: ${visual.bg};
          "
        >
          <div class="node-header">
            <span class="node-icon">${visual.icon}</span>
            <span class="node-title">${node.name}</span>
          </div>
          ${node.ip ? `<div class="node-ip">${node.ip}</div>` : ''}
          ${node.specs ? `<div class="node-specs">${node.specs}</div>` : ''}
          <div class="node-badge" style="background: ${visual.border}33; color: ${visual.border};">
            ${visual.badge}
          </div>
        </div>
      `;
    }).join('')}
  </div>
</body>
</html>`;
}
