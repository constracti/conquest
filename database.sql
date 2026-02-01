DROP TABLE IF EXISTS `attempt`;
CREATE TABLE `attempt` (
	`id` int(11) NOT NULL,
	`station` int(11) NOT NULL,
	`team` int(11) NOT NULL,
	`score` int(11) NOT NULL,
	`time` int(11) NOT NULL,
	`game` int(11) NOT NULL
);

DROP TABLE IF EXISTS `game`;
CREATE TABLE `game` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(255) DEFAULT NULL,
	`hash` varchar(255) NOT NULL,
	`game_start` int(11) NOT NULL,
	`game_stop` int(11) NOT NULL,
	`reward_success` int(11) NOT NULL,
	`reward_conquest` int(11) NOT NULL,
	`reward_rate` float NOT NULL,
	`map` varchar(255) DEFAULT NULL
);

DROP TABLE IF EXISTS `participant`;
CREATE TABLE `participant` (
	`attempt` int(11) NOT NULL,
	`player` int(11) NOT NULL,
	`game` int(11) NOT NULL
);

DROP TABLE IF EXISTS `player`;
CREATE TABLE `player` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`mark` varchar(255) NOT NULL,
	`team` int(11) NOT NULL,
	`game` int(11) NOT NULL
);

DROP TABLE IF EXISTS `polygon`;
CREATE TABLE `polygon` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text DEFAULT NULL,
	`game` int(11) NOT NULL
);

DROP TABLE IF EXISTS `station`;
CREATE TABLE `station` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(255) NOT NULL,
	`polygon` int(11) DEFAULT NULL,
	`capacity` int(11) NOT NULL,
	`score_sign` tinyint(1) NOT NULL,
	`score_base` int(11) DEFAULT NULL,
	`score_high` int(11) DEFAULT NULL,
	`game` int(11) NOT NULL
);

DROP TABLE IF EXISTS `team`;
CREATE TABLE `team` (
	`id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`background_color` varchar(255) NOT NULL,
	`text_color` varchar(255) NOT NULL,
	`game` int(11) NOT NULL
);


ALTER TABLE `attempt`
	ADD PRIMARY KEY (`id`),
	ADD KEY `game` (`game`),
	ADD KEY `station` (`station`),
	ADD KEY `team` (`team`);

ALTER TABLE `game`
	ADD PRIMARY KEY (`id`);

ALTER TABLE `participant`
	ADD PRIMARY KEY (`attempt`,`player`),
	ADD KEY `player` (`player`),
	ADD KEY `game` (`game`);

ALTER TABLE `player`
	ADD PRIMARY KEY (`id`),
	ADD KEY `team` (`team`),
	ADD KEY `game` (`game`);

ALTER TABLE `polygon`
	ADD PRIMARY KEY (`id`),
	ADD KEY `game` (`game`);

ALTER TABLE `station`
	ADD PRIMARY KEY (`id`),
	ADD KEY `polygon` (`polygon`),
	ADD KEY `game` (`game`);

ALTER TABLE `team`
	ADD PRIMARY KEY (`id`),
	ADD KEY `game` (`game`);


ALTER TABLE `attempt`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `game`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `player`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `polygon`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `station`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `team`
	MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;


ALTER TABLE `attempt`
	ADD CONSTRAINT `attempt_ibfk_1` FOREIGN KEY (`station`) REFERENCES `station` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	ADD CONSTRAINT `attempt_ibfk_2` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	ADD CONSTRAINT `attempt_ibfk_3` FOREIGN KEY (`team`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `participant`
	ADD CONSTRAINT `participant_ibfk_1` FOREIGN KEY (`attempt`) REFERENCES `attempt` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	ADD CONSTRAINT `participant_ibfk_2` FOREIGN KEY (`player`) REFERENCES `player` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	ADD CONSTRAINT `participant_ibfk_3` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `player`
	ADD CONSTRAINT `player_ibfk_1` FOREIGN KEY (`team`) REFERENCES `team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	ADD CONSTRAINT `player_ibfk_2` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `polygon`
	ADD CONSTRAINT `polygon_ibfk_1` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `station`
	ADD CONSTRAINT `station_ibfk_1` FOREIGN KEY (`polygon`) REFERENCES `polygon` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
	ADD CONSTRAINT `station_ibfk_2` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `team`
	ADD CONSTRAINT `team_ibfk_1` FOREIGN KEY (`game`) REFERENCES `game` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
