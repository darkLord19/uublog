---
id: 4
title: "Dead simple proxy!"
slug: "dead-simple-proxy"
category: "technology"
author: "umang"
created_date: "2018-09-05T03:33:59.889205+00:00"
published_date: "2018-09-05T20:31:18.516617+00:00"
keywords: null
---

On one fine night, I am searching google for some stuff and I follow a search result and what do I see?  "Access Denied....".

I have this curiosity about knowing stuff and it often leads me to some websites where I am greeted by this message from my university firewall. And so I need to use [VPNs](https://www.hotspotshield.com/what-is-a-vpn/) to access those sites. But my university firewall is so smart! It detects and blocks any kind of data coming from VPN by **magic**(I don't know how they exactly detect it and blocks any internet traffic. It is simple to block many public VPNs because we can know their IP ranges and so we can block any connection request to those IPs. But the firewall is so smart(Or I am that dumb!) that it even detected VPN hosted on my own [VPS](https://en.wikipedia.org/wiki/Virtual_private_server). So if any of you readers know algorithms for same, let me know.)

Another problem with VPNs is latency and low bandwidth. Some public VPNs still work(Again no idea why and how) but they are very slow and it is a sin to even think about downloading files using them. Another thing is, you must have heard  'If you are not paying for a product, you're the product itself'. So if I am using a free VPN service, I can't trust them because who knows what are they doing to earn money!?

So lately I started searching about free proxy sites to bypass firewall and I was impressed by the speed and ease of use(No need to do any additional setup) and so I thought why not host my own proxy server? And the quest began!

I checked out many open source proxy server projects but I found them too much complicated to use so I thought let's write my own proxy server software but soon I realized that it is not that easy! I decided to work on my proxy server gradually and one day it will be ready to use(But I know it would have been lost in /dev/null with my other projects!). I had almost given up but then a miracle happened! I came across something called **[SSH Tunneling](https://www.ssh.com/ssh/tunneling/)** and **[SOCKS5](https://en.wikipedia.org/wiki/SOCKS)**.

We can create socks tunnel using ssh. What it basically means is when a program is configured to use the proxy, it sends it all the data to VPS and VPS sends back the response which is used by the program. Another great thing is it doesn't require any client or server software. Al you need is a VPS with ssh access. That's it!

I won't write how to create this tunnel and how to use it because someone has already written a pretty great tutorial about the same. [Here you go.](https://www.digitalocean.com/community/tutorials/how-to-route-web-traffic-securely-without-a-vpn-using-a-socks-tunnel)

P.S. - To make cli apps use of this proxy, export http_proxy=localhost:port in your shell.
