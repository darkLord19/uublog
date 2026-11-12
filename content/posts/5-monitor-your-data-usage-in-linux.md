---
id: 5
title: "Monitor your data usage in Linux"
slug: "monitor-your-data-usage-in-linux"
category: "technology"
author: "umang"
created_date: "2018-11-22T16:28:16.391817+00:00"
published_date: "2018-11-22T16:44:43.221471+00:00"
keywords: null
---

vnStat is a command line utility which helps users in monitoring, logging and viewing network statistics over various time periods for various network interfaces.
##How to install?
For Arch and its derivatives:
```
pacman -S vnstat
```
For Debian and its derivatives:
```
apt install vnstat
```
##How to setup?
vnStat monitors data usage on a network interface basis so first you'll need to know the name of the network interface you want to monitor.
For that, run below command in terminal:
```
ip link
```
To initialize monitoring on any network interface, run following command:
```
vnstat -u -i wlp0s20u2
```
Here wlp0s20u2 is name of my network interface. Replace it with your network interface's name.
Now start vnStat daemon using below command, so that it can start monitoring network traffic.
```
systemctl enable --now vnstat
```
##How to use?
Type "vnstat" in the terminal to get default data usage which is in the form monthly summary.

To see data usage of a particular network interface:
```
vnstat -i wlp0s20u2
```
To see daily data usage of a particular network interface:
```
vnstat -i wlp0s20u2 -d
```
To see hourly data usage of the past 24 hours of a particular network interface:
```
vnstat -i wlp0s20u2 -h
```
You can monitor weekly, monthly, yearly and live(at this moment) data usage by using various flags which I leave up to you to find out.
