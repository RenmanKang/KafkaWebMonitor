# KafkaWebMonitor

=========

## 1. Introduction

Kafka Web Monitor is a node.js application for monitoring [Apache Kafka](http://kafka.apache.org/)

## 2. Prerequisite

- Node.js (v0.10.29)
	- [https://nodejs.org/download/release/v0.10.9](https://nodejs.org/download/release/v0.10.9)
- npm(JavaScript package manager) 
	- [https://github.com/npm/npm](https://github.com/npm/npm)

## 3. Installation

- Download KafkaWebMonitor  
	- [https://github.com/RenmanKang/KafkaWebMonitor](https://github.com/RenmanKang/KafkaWebMonitor)

- Install node module

```sh
cd KafkaWebMonitor
npm install
```

## 4. Setting up

- Change the `port` or `logger filename` path, and other settings.

```sh
cd KafkaWebMonitor/conf
vi config.js
-----
	port: 9000,
	locales: ['en', 'ko'],
	session: {
		max_age: 1000 * 60 * 60 * 24
	},
	// Kafka node caching time. millisecond
	cache_age: 1000 * 60 * 5,
	chart_tick_time: 5000,
	logger: {
		access: {
			category: 'access',
			type: 'dateFile',
			filename: __dirname+'/../logs/kwm-access.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		},
		app: {
			category: 'app',
			type: 'dateFile',
			filename: __dirname+'/../logs/kwm-app.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		}
	}
-----
```

## 5. Running It

```sh
cd KafkaWebMonitor
node ./bin/www
```

## 6. Screenshot

- Kafka Web Monitor main page

![Main page](/img/main.png)

***

- Registered brokers

![Brokers](/img/addhost.png)

***

- Offset monitoring chart

![Offset monitoring chart](/img/chart.png)

***

## 7. Reference

- Kafka Web Console 
	- [https://github.com/claudemamo/kafka-web-console](https://github.com/claudemamo/kafka-web-console)
	
- Kafka Offset Monitor 
	- [https://github.com/quantifind/KafkaOffsetMonitor](https://github.com/quantifind/KafkaOffsetMonitor)
