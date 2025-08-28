-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 28, 2025 at 11:19 AM
-- Server version: 10.6.16-MariaDB-cll-lve-log
-- PHP Version: 8.2.15

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lfbmkhcc_oGV`
--

-- --------------------------------------------------------

--
-- Table structure for table `entity`
--

CREATE TABLE `entity` (
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('national','local') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `entity`
--

INSERT INTO `entity` (`entity_id`, `name`, `type`, `created_at`) VALUES
(1, 'FHN', 'local', '2025-08-27 12:46:34'),
(2, 'Hanoi', 'local', '2025-08-27 14:59:26'),
(3, 'NEU', 'local', '2025-08-27 14:59:29'),
(4, 'Danang', 'local', '2025-08-27 14:59:34'),
(5, 'FHCMC', 'local', '2025-08-27 14:59:40'),
(6, 'HCMC', 'local', '2025-08-27 14:59:42'),
(7, 'HCME', 'local', '2025-08-27 14:59:48'),
(8, 'HCMS', 'local', '2025-08-27 14:59:53'),
(9, 'Cantho', 'local', '2025-08-27 14:59:58'),
(10, 'EMT', 'national', '2025-08-27 15:00:10'),
(12, 'EST', 'national', '2025-08-27 15:00:22');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','lead','member') NOT NULL DEFAULT 'member',
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `entity_id`, `email`, `name`, `password`, `role`, `status`, `created_at`) VALUES
(1, 1, 'emt.vietnam@aiesec.net', 'EMT Vietnam Admin', '$2b$10$ncPxdZkMi7ItmYcCc97nf.Bntph8mb0.jcAZjX9U57DeLyyAOiia6', 'admin', 1, '2025-08-27 12:46:34'),
(2, 7, 'hcme.lead.vietnam@aiesec.net', 'HCME', '$2b$10$DkPGNfuxosirjel6FMmd0esJmMWDrUHDbq0xqvawv13Cspx6gH1lW', 'lead', 1, '2025-08-27 17:28:56');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `entity`
--
ALTER TABLE `entity`
  ADD PRIMARY KEY (`entity_id`),
  ADD UNIQUE KEY `uq_entity_name` (`name`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_user_email` (`email`),
  ADD KEY `idx_user_entity` (`entity_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `entity`
--
ALTER TABLE `entity`
  MODIFY `entity_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `fk_user_entity` FOREIGN KEY (`entity_id`) REFERENCES `entity` (`entity_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
