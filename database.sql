DROP TABLE IF EXISTS `config`;
CREATE TABLE `config` (
	`name` varchar(255) NOT NULL,
	`value` text NOT NULL
);

DROP TABLE IF EXISTS `game`;
CREATE TABLE `game` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) DEFAULT NULL,
	`hash` varchar(255) NOT NULL,
	`map` varchar(255) DEFAULT NULL
);

DROP TABLE IF EXISTS `place`;
CREATE TABLE `place` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`top` float NOT NULL,
	`left` float NOT NULL,
	`width` float NOT NULL
);

DROP TABLE IF EXISTS `player`;
CREATE TABLE `player` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`team` int(11) NOT NULL,
	`block` tinyint(1) NOT NULL
);

DROP TABLE IF EXISTS `polygon`;
CREATE TABLE `polygon` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text DEFAULT NULL,
	`game` varchar(255) NOT NULL
);

DROP TABLE IF EXISTS `station`;
CREATE TABLE `station` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(255) NOT NULL,
	`capacity` int(11) NOT NULL,
	`place` int(11) DEFAULT NULL
);

DROP TABLE IF EXISTS `station2`;
CREATE TABLE `station2` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(255) NOT NULL,
	`capacity` int(11) NOT NULL,
	`polygon` int(11) DEFAULT NULL,
	`game` varchar(255) NOT NULL
);

DROP TABLE IF EXISTS `success`;
CREATE TABLE `success` (
	`id` int(11) NOT NULL,
	`station` int(11) NOT NULL,
	`player` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`dt` datetime NOT NULL
);

DROP TABLE IF EXISTS `team`;
CREATE TABLE `team` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(255) NOT NULL
);

DROP TABLE IF EXISTS `team2`;
CREATE TABLE `team2` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`background_color` varchar(255) NOT NULL,
	`text_color` varchar(255) NOT NULL,
	`game` varchar(255) NOT NULL
);


ALTER TABLE `config`
	ADD PRIMARY KEY (`name`);

ALTER TABLE `game`
	ADD PRIMARY KEY (`id`);

ALTER TABLE `place`
	ADD PRIMARY KEY (`id`);

ALTER TABLE `player`
	ADD PRIMARY KEY (`id`),
	ADD KEY `team` (`team`);

ALTER TABLE `polygon`
	ADD PRIMARY KEY (`id`),
	ADD KEY `game` (`game`);

ALTER TABLE `station`
	ADD PRIMARY KEY (`id`),
	ADD KEY `place` (`place`);

ALTER TABLE `station2`
	ADD PRIMARY KEY (`id`),
	ADD KEY `polygon` (`polygon`),
	ADD KEY `game` (`game`);

ALTER TABLE `success`
	ADD PRIMARY KEY (`id`),
	ADD KEY `station` (`station`),
	ADD KEY `player` (`player`);

ALTER TABLE `team`
	ADD PRIMARY KEY (`id`);

ALTER TABLE `team2`
	ADD PRIMARY KEY (`id`),
	ADD KEY `game` (`game`);


ALTER TABLE `place`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `polygon`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `station`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `station2`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `success`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `team`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `team2`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;


ALTER TABLE `player`
	ADD CONSTRAINT `player_ibfk_1` FOREIGN KEY (`team`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `polygon`
	ADD CONSTRAINT `polygon_ibfk_1` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `station`
	ADD CONSTRAINT `station_ibfk_1` FOREIGN KEY (`place`) REFERENCES `place` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `station2`
	ADD CONSTRAINT `station2_ibfk_1` FOREIGN KEY (`polygon`) REFERENCES `polygon` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
	ADD CONSTRAINT `station2_ibfk_2` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `success`
	ADD CONSTRAINT `success_ibfk_1` FOREIGN KEY (`station`) REFERENCES `station` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	ADD CONSTRAINT `success_ibfk_2` FOREIGN KEY (`player`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `team2`
	ADD CONSTRAINT `team2_ibfk_1` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
