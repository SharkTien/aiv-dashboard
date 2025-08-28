-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 28, 2025 at 04:33 PM
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
-- Table structure for table `forms`
--

CREATE TABLE `forms` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `forms`
--

INSERT INTO `forms` (`id`, `code`, `name`, `created_at`, `updated_at`) VALUES
(4, 'ogv-w24-submissions-1756364313312', 'oGV W24 Submissions', '2025-08-28 06:58:34', '2025-08-28 06:58:34');

-- --------------------------------------------------------

--
-- Table structure for table `form_fields`
--

CREATE TABLE `form_fields` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `form_id` bigint(20) UNSIGNED NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `field_label` varchar(255) NOT NULL,
  `field_type` varchar(50) NOT NULL,
  `field_options` text DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `form_fields`
--

INSERT INTO `form_fields` (`id`, `form_id`, `field_name`, `field_label`, `field_type`, `field_options`, `is_required`, `sort_order`, `created_at`, `updated_at`) VALUES
(10, 4, 'timestamp', 'timestamp', 'datetime', NULL, 0, 1, '2025-08-28 07:00:25', '2025-08-28 07:00:25'),
(11, 4, 'form-code', 'form-code', 'text', NULL, 0, 2, '2025-08-28 07:00:37', '2025-08-28 07:00:37'),
(12, 4, 'name', 'name', 'text', NULL, 0, 3, '2025-08-28 07:00:43', '2025-08-28 07:00:43'),
(13, 4, 'birth', 'birth', 'number', NULL, 0, 4, '2025-08-28 07:00:51', '2025-08-28 07:00:51'),
(14, 4, 'fb', 'fb', 'text', NULL, 0, 5, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(15, 4, 'phone', 'phone', 'text', NULL, 0, 6, '2025-08-28 07:01:03', '2025-08-28 07:01:03'),
(16, 4, 'email', 'email', 'email', NULL, 0, 7, '2025-08-28 07:01:08', '2025-08-28 07:01:08'),
(17, 4, 'livewhere', 'livewhere', 'text', NULL, 0, 8, '2025-08-28 07:01:14', '2025-08-28 07:01:14'),
(18, 4, 'uni', 'uni', 'database', '{\"source\":\"uni_mapping\"}', 0, 9, '2025-08-28 07:10:28', '2025-08-28 07:10:28'),
(19, 4, 'other--uni', 'other--uni', 'text', NULL, 0, 10, '2025-08-28 07:10:45', '2025-08-28 07:10:45'),
(20, 4, 'UniversityYear', 'UniversityYear', 'number', NULL, 0, 11, '2025-08-28 07:10:59', '2025-08-28 07:10:59'),
(21, 4, 'Major', 'Major', 'text', NULL, 0, 12, '2025-08-28 07:11:03', '2025-08-28 07:11:03'),
(22, 4, 'startdate', 'startdate', 'text', NULL, 0, 13, '2025-08-28 07:11:08', '2025-08-28 07:11:08'),
(23, 4, 'enddate', 'enddate', 'text', NULL, 0, 14, '2025-08-28 07:11:15', '2025-08-28 07:11:15'),
(24, 4, 'Channel', 'Channel', 'text', NULL, 0, 15, '2025-08-28 07:11:19', '2025-08-28 07:11:19'),
(25, 4, 'promoteLeadership', 'promoteLeadership', 'number', NULL, 0, 16, '2025-08-28 07:11:27', '2025-08-28 07:11:27'),
(26, 4, 'ReceiveInformation', 'ReceiveInformation', 'text', NULL, 0, 17, '2025-08-28 07:11:36', '2025-08-28 07:11:36'),
(27, 4, 'categorize', 'categorize', 'text', NULL, 0, 18, '2025-08-28 07:11:48', '2025-08-28 07:11:48'),
(28, 4, 'utm_source', 'utm_source', 'text', NULL, 0, 19, '2025-08-28 07:11:53', '2025-08-28 07:11:53'),
(29, 4, 'utm_medium', 'utm_medium', 'text', NULL, 0, 20, '2025-08-28 07:11:59', '2025-08-28 07:11:59'),
(30, 4, 'utm_campaign', 'utm_campaign', 'text', NULL, 0, 21, '2025-08-28 07:12:03', '2025-08-28 07:12:03'),
(31, 4, 'utm_id', 'utm_id', 'number', NULL, 0, 22, '2025-08-28 07:12:12', '2025-08-28 07:12:12'),
(32, 4, 'utm_content', 'utm_content', 'text', NULL, 0, 23, '2025-08-28 07:12:19', '2025-08-28 07:12:19');

-- --------------------------------------------------------

--
-- Table structure for table `form_responses`
--

CREATE TABLE `form_responses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `submission_id` bigint(20) UNSIGNED NOT NULL,
  `field_id` bigint(20) UNSIGNED NOT NULL,
  `value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `form_submissions`
--

CREATE TABLE `form_submissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `form_id` bigint(20) UNSIGNED NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `uni_mapping`
--

CREATE TABLE `uni_mapping` (
  `uni_id` bigint(20) UNSIGNED NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `uni_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mapping table for university entities';

--
-- Dumping data for table `uni_mapping`
--

INSERT INTO `uni_mapping` (`uni_id`, `entity_id`, `uni_name`, `created_at`, `updated_at`) VALUES
(1, 2, 'Đại học Quốc gia Hà Nội (Vietnam National University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(2, 2, 'Trường Đại học Khoa học Tự nhiên - Đại học Quốc gia Hà Nội (VNU University of Science)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(3, 2, 'Trường Đại học Khoa học Xã hội và Nhân văn - Đại học Quốc gia Hà Nội (VNU University of Social Sciences and Humanities)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(4, 2, 'Trường Đại học Ngoại ngữ - Đại học Quốc gia Hà Nội (VNU University of Languages and International Studies)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(5, 2, 'Trường Đại học Công nghệ - Đại học Quốc gia Hà Nội (VNU University of Engineering and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(6, 2, 'Trường Đại học Kinh tế - Đại học Quốc gia Hà Nội (VNU University of Economics and Business)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(7, 2, 'Trường Đại học Giáo dục - Đại học Quốc gia Hà Nội (VNU University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(8, 2, 'Trường Đại học Việt - Nhật - Đại học Quốc gia Hà Nội (VNU Vietnam Japan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(9, 2, 'Trường Đại học Y Dược - Đại học Quốc gia Hà Nội (VNU University of Medicine and Pharmacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(10, 2, 'Trường Đại học Luật - Đại học Quốc gia Hà Nội (VNU University of Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(11, 2, 'Trường Quốc tế - Đại học Quốc gia Hà Nội (VNU International School)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(12, 2, 'Trường Quản trị và Kinh doanh - Đại học Quốc gia Hà Nội (VNU Hanoi School of Business and Management)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(13, 2, 'Trường Khoa học liên ngành và Nghệ thuật - Đại học Quốc gia Hà Nội (VNU School of Interdisciplinary Sciences and Arts)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(14, 2, 'Khoa Quốc tế Pháp ngữ - Đại học Quốc gia Hà Nội (International Francophone Institute)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(15, 2, 'Đại học Hà Nội + LaTrobe (Hanoi University + LaTrobe)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(16, 2, 'Học viện Ngân hàng (Banking Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(17, 2, 'Đại học Bách khoa Hà Nội (Hanoi University of Science and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(18, 2, 'Đại học Thương mại (Vietnam University of Commerce)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(19, 2, 'Đại học Khoa học và Công nghệ Hà Nội (University of Science and Technology of Hanoi)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(20, 2, 'Truyền thông đa phương tiện ARENA (ARENA Multimedia)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(21, 2, 'Đại học Kinh doanh và Công nghệ (Hanoi University of Business and Technology (HUBT))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(22, 3, 'Đại học Quốc tế RMIT (RMIT University (Hanoi))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(23, 2, 'Đại học Kiến trúc Hà Nội (Hanoi Architectural University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(24, 2, 'Đại học Lao động Xã hội (University of Labour and Social Affairs)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(25, 2, 'Đại học Kinh tế Kỹ thuật Công nghiệp (University of Economic and Technical Industries)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(26, 2, 'Đại học Thủy lợi (Water Resources University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(27, 2, 'Đại học Công đoàn (Vietnam Trade Union University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(28, 2, 'Học viện Quân y (Vietnam Military Medical University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(29, 2, 'Đại học Đại Nam (Dai Nam University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(30, 2, 'Học viện Thanh Thiếu niên Việt Nam (Vietnam Youth Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(31, 2, 'Đại học Công nghiệp Việt Hung (Viet Hung Industrial University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(32, 2, 'Đại học Sư phạm Nghệ thuật Trung ương Hà Nội (National University of Art Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(33, 2, 'Đại học Tài chính Ngân hàng Hà Nội (Financial and Banking University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(34, 2, 'Đại học Công nghệ và Quản lý Hữu nghị (Huu Nghi University of Technology and Management)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(35, 2, 'Đại học Tài nguyên và Môi trường Hà Nội (Hanoi University of Natural Resources and Environment)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(36, 2, 'Đại học Y Hà Nội (Hanoi Medical University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(37, 2, 'Đại học Mỹ thuật Việt Nam (Vietnam University of Fine Arts)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(38, 2, 'Học viện Nông nghiệp Việt Nam (VNUA) (Vietnam University of Agriculture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(39, 2, 'University College London (UCL) (University College London (UCL))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(40, 2, 'Trường cao đẳng du lịch Hà Nội (Hanoi tourism college)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(41, 2, 'Cao đẳng Y Hà Nội (Hanoi Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(42, 1, 'Đại học Ngoại thương (Foreign Trade University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(43, 1, 'Học viện Ngoại giao (Diplomatic Academy of Vietnam)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(44, 1, 'Học viện Báo chí Tuyên truyền (Academy of Journalism and Communication)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(45, 1, 'Đại học Sư phạm Hà Nội (Hanoi National University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(46, 1, 'Đại học Luật Hà Nội (Hanoi Law University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(47, 1, 'Đại học FPT (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(48, 1, 'Học viện Tài chính (Academy of Finance)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(49, 1, 'British University Vietnam (British University Vietnam)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(50, 1, 'Đại học Mỹ thuật Công nghiệp (Industrial Fine Art University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(51, 1, 'Học viện Công nghệ Bưu chính Viễn thông (Posts and Telecommunications Institute of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(52, 1, 'Đại học Công nghệ Giao thông vận tải (University of Transport Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(53, 1, 'Đại học Dược Hà Nội (Hanoi University of Pharmacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(54, 1, 'Đại học Điện lực (Electric Power University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(55, 1, 'Đại học Lâm nghiệp (Vietnam Forestry University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(56, 1, 'Học viện An ninh Nhân dân (People\'s Police Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(57, 1, 'Học viện Hành chính Quốc gia (National Academy of Public Administration)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(58, 1, 'Học viện Y Dược học cổ truyền Việt Nam (Vietnam University of Traditional Medicine)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(59, 1, 'Đại học Giao thông vận tải (University of Communications and Transport)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(60, 1, 'Đại học Nội vụ Hà Nội (University of Home Affairs)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(61, 1, 'Đại học Y tế Công cộng (Hanoi School Of Public Health)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(62, 1, 'Đại học Nguyễn Trãi ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(63, 1, 'Đại học Phenikaa ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(64, 1, 'Cao đẳng nghề Bách Khoa Hà Nội (Hanoi Vocational College of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(65, 1, 'Cao đẳng y tế Hà Đông (Hadong Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(66, 1, 'Cao đẳng y tế Bạch Mai ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(67, 1, 'Học viện Tòa Án (Vietnam Court Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(68, 1, 'Swinburne Vietnam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(69, 1, 'Greenwich Vietnam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(70, 1, 'Cao đẳng Y tế Hà Nội (Hanoi Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(71, 3, 'Đại học Kinh tế Quốc dân (National Economics University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(72, 3, 'Đại học Thăng Long (Thang Long University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(73, 3, 'Đại học Văn hóa Hà Nội (Hanoi University Of Culture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(74, 3, 'Học viện Âm nhạc Quốc gia Việt Nam (Vietnam National Academy of Music)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(75, 3, 'Đại học Sư phạm Thể dục thể thao Hà nội ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(76, 3, 'Đại học Hòa Bình (Hoa Binh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(77, 3, 'Viện Đại học Mở Hà Nội (Hanoi Open University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(78, 3, 'Học viện Chính sách và Phát triển (Academy of Policy and Development)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(79, 3, 'Học viện Quản lý Giáo dục (National Institute of Education Management)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(80, 3, 'Đại học Mỏ Địa chất Hà Nội (Hanoi University of Mining and Geology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(81, 3, 'Học viện Khoa học Quân sự (Military Science Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(82, 3, 'Đại học Xây dựng (National University of Civil Engineering)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(83, 3, 'Học viện Kỹ thuật Mật mã (Academy of Crytography Techniques)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(84, 3, 'Đại học Công nghiệp Hà Nội (Hanoi University of Industry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(85, 3, 'Đại học Sân khấu Điện ảnh ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(86, 3, 'Đại học Đông Đô (Dong Do University of Science and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(87, 3, 'Đại học Quốc tế Bắc Hà ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(88, 3, 'Đại học Thành Đô ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(89, 3, 'Đại học Hàng Hải (Vietnam Maritime University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(90, 3, 'Cao đẳng Y dược Thanh Hóa  (Thanh Hoa Medical college)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(91, 3, 'Cao đẳng Cộng đồng Hà Nội (Hanoi Community College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(92, 3, 'Đại học Y Dược Hải Phòng (Hai Phong Medical University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(93, 3, 'Đại học Khoa học Thái Nguyên (Thai Nguyen University of Sciences (TNUS))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(94, 3, 'Đại học Phương Đông (Phuong Dong University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(95, 3, 'Cao Đẳng Sư Phạm Hà Nội (Hanoi College of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(96, 3, 'Học viện Phụ nữ Việt Nam (Vietnam Woman\'s Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(97, 3, 'Vin University', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(98, 3, 'Đại học Kiểm sát Hà Nội (Hanoi Procuratorate University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(99, 6, 'Đại học Kinh tế (University of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(100, 6, 'Đại học Khoa học Xã hội và Nhân văn (University of Social Sciences and Humanities)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(101, 6, 'Đại học Quốc tế (International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(102, 6, 'Đại học Hoa Sen (Hoa Sen University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(103, 6, 'Đại học Y Dược (Ho Chi Minh University of Medicine and Pharmacy) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(104, 6, 'Đại học Công nghệ (HUTECH University HCM) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(105, 6, 'Đại học Kiến trúc (Ho Chi Minh City University of Architecture) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(106, 6, 'Đại học Y Pham Ngoc Thach (Pham Ngoc Thach University of Medicine) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(107, 6, 'Đại học Thủy lợi (Thuyloi University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(108, 6, 'Đại học Lạc Hồng (Lac Hong University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(109, 6, 'Đại học Sài Gòn (Saigon University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(110, 6, 'Cao đẳng kinh tế đối ngoại (College of Foreign Economic Relations) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(111, 6, 'Đại học Pháp (French University - VietNam national university (HCM)) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(112, 6, 'Đại học Hồng Đức (Hong Duc Medical School) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(113, 6, 'Đại học Troy (Troy University (HCM)) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(114, 6, 'Đại học Tân Tạo (Tan Tao University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(115, 6, 'Học viện hàng không (Vietnam Aviation Academy) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(116, 6, 'Nhạc viện (Conservatory of Ho Chi Minh City) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(117, 6, 'Đại học Mỹ Thuật (University of arts) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(118, 6, 'Trường trung cấp du lịch & khách sạn Saigontourist - Saigontourist Hospitality College ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(119, 6, 'Khoa Y - Đại học Quốc gia ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(120, 6, 'Đại học Tài chính - Kế Toán ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(121, 6, 'Đại học Gia Định ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(122, 6, 'Cao đẳng Kinh tế - Kỹ thuật Vinatex TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(123, 6, 'Cao đẳng Kinh tế TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(124, 6, 'Cao đẳng Kỹ thuật Cao Thắng ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(125, 6, 'Cao đẳng Tài chính Hải quan ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(126, 6, 'Cao đẳng Bách Việt (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(127, 6, 'Cao đẳng Đại Việt Sài Gòn (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(128, 6, 'Đại học Du lịch Sài Gòn (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(129, 6, 'Học viện doanh nhân LP Việt Nam ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(130, 6, 'Trường Quản Trị Khách Sạn và Du lịch Vatel ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(131, 6, 'Cao đẳng Du lịch Sài Gòn ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(132, 6, 'Đại học Quản lý và Công nghệ TP. Hồ Chí Minh (University of Management and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(133, 6, 'Đại học Western Sydney - Việt Nam (Western Sydney University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(134, 5, 'Đại học Ngoại thương (Foreign Trade University - HCMC)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(135, 5, 'Đại học Ngân hàng (Banking University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(136, 5, 'Đại học Ngoại ngữ - Tin học TP. Hồ Chí Minh (University of Foreign Languages & Information Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(137, 5, 'Đại học Tài Chính Marketing (University of Finance and Marketing)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(138, 5, 'Đại học Sư phạm (University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(140, 5, 'Greenwich Việt Nam - Cơ sở TP.HCM (University of Greenwich Vietnam - HCMC Campus)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(141, 5, 'Swinburne Việt Nam - Cơ sở TP.HCM (Swinburne Vietnam - HCMC Campus)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(142, 5, 'Đại học Công nghiệp (Industry University - HCMC)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(143, 5, 'Đại học Hồng Bàng (Hong Bang University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(144, 5, 'Đại học Công Thương (HCMC University of Industry and Trade)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(145, 5, 'Đại học Tài nguyên và Môi trường (HCMC University of Natural Resources and Environment)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(146, 5, 'Đại học Giao thông vận tải (University of Transport and Communication - Campus II)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(147, 5, 'Học viện công nghệ bưu chính viễn thông (Posts and Telecommunications Institute of Technology) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(148, 5, 'ERC International', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(149, 5, 'THPT Quốc tế Việt Úc (Saigon International College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(150, 5, 'Đại học Vinh (Vinh University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(151, 5, 'Học viện kĩ thuật mật mã (Academy of Crytography Techniques) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(152, 5, 'Đại học Hùng Vương (Hung Vuong university) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(153, 5, 'Trường Đại học kinh doanh quốc tế - University of Business International Studies (UBIS) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(154, 5, 'Trường đại học Dầu khí Việt Nam (PetroVietnam University - PVU)   ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(155, 5, 'Broward College ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(156, 5, 'Đại học Văn Hiến (Văn Hiến University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(157, 5, 'Học viện Cảnh sát Nhân dân ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(158, 5, 'Đại học Lao động - Xã hội ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(159, 5, 'ĐH Sư phạm Thể dục Thể thao  ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(160, 5, 'Cao đẳng Giao thông Vận tải  ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(161, 5, 'Cao đẳng Công thương  ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(162, 5, 'Cao đẳng Sư phạm Trung ương TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(163, 5, 'Cao đẳng Văn hóa Nghệ thuật TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(164, 5, 'Cao đẳng Kỹ thuật Công nghệ Vạn Xuân (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(165, 5, 'Cao đẳng Kinh tế - Công nghệ TP.HCM (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(166, 5, 'Cao đẳng Kinh tế Kỹ thuật Miền Nam (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(167, 5, 'Cao đẳng Y tế Pasteur ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(168, 5, 'Cao đẳng Viễn Đông ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(169, 5, 'Học viện Cán bộ TP. Hồ Chí Minh (Ho Chi Minh Cadre Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(170, 7, 'Đại học Kinh tế- Luật (University of Economics And Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(171, 7, 'Đại học Luật (University of Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(172, 7, 'Đại học Sư phạm Kỹ thuật (University of Technology and Education HCM)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(173, 7, 'Đại học Khoa học Tự nhiên (University of Science)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(174, 7, 'Đại học Mở (Open University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(175, 7, 'Đại học Công nghệ Thông tin (HCMC University of Information Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(176, 7, 'Đại học Đồng Nai (Dong Nai University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(177, 7, 'Đại học Nông Lâm (HCMC University of Agriculture and Forestry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(178, 7, 'Đại học Thủ Dầu Một (Thu Dau Mot University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(179, 7, 'Đại học Quốc tế Miền Đông (Eastern International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(180, 7, 'Đại học Việt Đức (Vietnam - Germany University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(181, 7, 'Đại học Công nghệ  Đồng Nai', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(182, 7, 'Đại học Kinh tế Kỹ thuật Bình Dương', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(183, 7, 'Đại học Bình Dương', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(184, 7, 'Đại học Lạc Hồng Đồng Nai', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(185, 7, 'Đại học Công nghệ Miền Đông', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(186, 7, 'Đại học Lâm Nghiệp', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(187, 7, 'Cao đẳng Công Nghệ Thủ Đức TP.HCM (HCMC College of Technology Thu Duc)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(188, 7, 'Đại học Sunderland (Sunderland University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(189, 8, 'Đại học Văn Lang (Van Lang University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(190, 8, 'Đại học RMIT Hồ Chí Minh (RMIT Ho Chi Minh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(191, 8, 'Đại học Tôn Đức Thắng (Ton Duc Thang University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(192, 8, 'Đại học Bách Khoa (University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(193, 8, 'Đại học Kinh tế Tài chính (University of Economics and Finance)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(194, 8, 'Đại học Nguyễn Tất Thành (Nguyen Tat Thanh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(195, 8, 'Đại học công nghệ Sài Gòn (Saigontech) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(196, 8, 'Đại học Văn hóa (Ho Chi Minh City University of Culture) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(197, 8, 'Đại học Cảnh Sát Nhân Dân (People\'s Police University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(198, 8, 'Cao đẳng Việt Mỹ (American Polytechnic College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(199, 8, 'Học viện hành chính quốc gia (Ho Chi Minh National Academy of Politics and Public Administration) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(200, 8, 'Đại học An Ninh nhân dân ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(201, 8, 'ĐH Sân khấu Điện ảnh ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(202, 8, 'Đại học Trần Đại Nghĩa (Tran Dai Nghia University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(203, 8, 'Cao đẳng BC Công nghệ và Quản trị doanh nghiệp ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(204, 8, 'Cao đẳng Điện lực TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(205, 8, 'Cao đẳng Kinh tế Kỹ thuật TP. Hồ Chí Minh ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(206, 8, 'Cao đẳng Phát thanh Truyền hình 2 ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(207, 8, 'Cao đẳng Xây dựng số 2 ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(208, 8, 'Cao đẳng Công nghệ thông tin TP.HCM (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(209, 8, 'Cao đẳng Phương Nam ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(210, 8, 'Đại học Kinh Tế - Kỹ Thuật Công nghiệp University of Economic and Technical Industries. ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(211, 8, 'Đại học Fulbright (Fulbright University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(212, 8, 'Cao đẳng Y Dược Sài Gòn (Sai Gon Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(213, 8, 'Đại học Tư thục Quốc tế Sài Gòn (Saigon International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(214, 9, 'Đại Học Cần Thơ (Can Tho University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(215, 9, 'Đại học Y Dược Cần Thơ (Can Tho University of Medicine and Phamacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(217, 9, 'Đại Học Nam Cần Thơ (Nam Can Tho University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(218, 9, 'Đại học Võ Trường Toản (Vo Truong Toan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(219, 9, 'Đại học Kỹ thuật công nghệ Cần Thơ (Can Tho University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(220, 9, 'Đại học Tây Đô (Tay Do University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(221, 9, 'Đại học Greenwich (Greenwich University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(222, 9, 'Cao đẳng Cần Thơ (Can Tho College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(223, 9, 'Cao đẳng Cơ điện tử vầ Nông nghiệp Nam Bộ (Southern College for Engineering and Agriculture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(224, 9, 'Cao đẳng Kinh tế Kỹ thuật Cần Thơ (Can Tho Technical Economic College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(225, 9, 'Cao đẳng Nghề Cần Thơ (Can Tho Vocational College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(226, 9, 'Cao đẳng Nghề CNTT Ispace (Ispace College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(227, 9, 'Cao đẳng Nghề Việt Mỹ (American Polytechnic College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(228, 9, 'Cao đẳng Y tế Cần Thơ (Can Tho Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(229, 9, 'Cao đẳng nghề Du lịch Cần Thơ (Can Tho Tourism College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(230, 4, 'Đại học Kinh tế Đà Nẵng (Da Nang University of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(231, 4, 'Đại học Ngoại ngữ Đà Nẵng (Da Nang College of Foreign Languages)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(232, 4, 'Đại học Bách khoa Đà Nẵng (Da Nang University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(233, 4, 'Viện Nghiên Cứu & Đào Tạo Việt - Anh Đà Nẵng', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(234, 4, 'Đại học Duy Tân (Duy Tan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(235, 4, 'Đại học Ngoại Ngữ - ĐH Huế (Hue University of Foreign Languages) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(236, 4, 'Đại học Sư phạm Đà Nẵng (Da Nang College of Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(237, 4, 'Đại học Đà Nẵng Phân hiệu tại Kontum (Da Nang University Branch at Kontum) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(238, 4, 'Đại học Kỹ Thuật Y Dược Đà Nẵng (Danang University of Medical Technique) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(239, 4, 'Đại học FPT Đà Nẵng (Danang FPT University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(240, 4, 'Đại học Đông Á  (Danang Dong A University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(241, 4, 'Đại học Kiến trúc Đà Nẵng (Danang Architecture University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(242, 4, 'Đại học Kỹ Thuật Y Dược (Danang University of Medical Technique) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(243, 4, 'Cao đẳng Công Nghệ - ĐH Đà Nẵng (Danang College of Industry) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(244, 4, 'Cao đẳng Công Nghệ Thông Tin - ĐH Đà Nẵng (Danang College of Information & Technology) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(245, 4, 'Cao đẳng Công Nghệ Thông Tin Hữu Nghị Việt Hàn (Danang College of Information & Technology Vietnam-Korean) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(246, 4, 'Cao đẳng Công Nghệ Và Kinh Doanh Việt Tiến (Danang College of Industry & Business Viet Tien) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(247, 4, 'Cao đẳng Dân Lập Kinh Tế Kỹ Thuật Đông Du Đà Nẵng (Danang College of Economic & Technology Dong Du) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(248, 4, 'Cao đẳng Giao Thông Vận Tải II (Danang College of Transport) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(249, 4, 'Cao đẳng Kinh Tế - Kế Hoạch Đà Nẵng (Danang College of Economic) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(250, 4, 'Cao đẳng Lạc Việt (Danang Lac Viet College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(251, 4, 'Cao đẳng Lương Thực Thực Phẩm (Danang College of Food) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(252, 4, 'Cao đẳng Phương Đông - Đà Nẵng (Danang Phuong Dong College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(253, 4, 'Cao đẳng Thương Mại Đà Nẵng (Danang College of Commerce) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(254, 4, 'Cao đẳng Tư Thục Đức Trí - Đà Nẵng (Danang Duc Tri College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(255, 4, 'Cao đẳng Công Nghiệp Huế (Hue College of Industry) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(256, 4, 'Cao đẳng Sư Phạm Thừa Thiên Huế (Hue College of Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(257, 4, 'Cao đẳng Xây Dựng Công Trình Đô Thị - Cơ Sở Huế (Hue College of Urban Construction Engineering) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(258, 4, 'Cao đẳng Y Tế Huế (Hue College of Medicine) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(259, 4, 'Đại học Khoa Học - ĐH Huế (Hue University of Science) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(260, 4, 'Đại học Kinh Tế - ĐH Huế (Hue University of Economic) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(261, 4, 'Đại học Nghệ Thuật - ĐH Huế (Hue University of Arts) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(262, 4, 'Đại học Nông Lâm - ĐH Huế (Hue University of Agriculture and Forestry) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(263, 4, 'Đại học Phú Xuân - Huế (Hue Phu Xuan University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(264, 4, 'Đại học Sư Phạm - ĐH Huế (Hue University of Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(265, 4, 'Đại học Y Dược - ĐH Huế (Hue University of Medical) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(266, 4, 'Học viện Âm Nhạc Huế (Hue Academy of Music) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(267, 4, 'Đại học Huế - Khoa Du Lịch (Hue University - Faculty of Tourism) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(268, 4, 'Đại học Huế - Khoa Giáo Dục Thể Chất (Hue University - Faculty of Physical Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(269, 4, 'Đại học Huế - Khoa Luật (Hue University - Faculty of Law) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(271, 2, 'Khoa Quốc Tế - Đại học Quốc Gia Hà Nội (International School - VNU, Hanoi)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(272, 2, 'Đại học Khoa Học Xã hội và Nhân văn - ĐHQGHN (University of Social Sciences and Humanities - Hanoi, VNU)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(273, 2, 'Đại học Ngoại Ngữ Hà Nội (University of Languages and International Studies - VNU)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(274, 2, 'Đại học Lao động Xã hội HN (University of Labour and Social Affairs)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(275, 2, 'Đại học Nông nghiệp Hà Nội (Hanoi University of Agriculture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(276, 1, 'Đại học Sư phạm (National University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(277, 1, 'Đại học FPT HN (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(278, 1, 'Học viện Công nghệ Bưu chính Viễn thông HN (Posts and Telecommunications Institute of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(279, 1, 'Đại học Giao thông vận tải HN (University of Communications and Transport)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(280, 1, 'Đại học Thành Tây', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(281, 1, 'Đại học Greenwich Hà Nội', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(282, 1, 'Đại học Swinburne Việt Nam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(283, 1, 'Học viện Tòa án Hà Nội (Vietnam Court Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(284, 1, 'Trung Cấp Giao Thông Vận Tải', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(285, 3, 'VinUniversity', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(286, 3, 'Học viện Phụ nữ Việt Nam (Vietnam Women\'s Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(287, 3, 'Gap year after highschool in North region (exclude Hanoi)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(288, 8, 'Viện đào tạo quốc tế đại học Nguyễn Tất Thành (Nguyen Tat Thanh Institute of International Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(289, 8, 'Cao đẳng Quốc tế Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(290, 8, 'Đại Học Tư Thục Công Nghệ Thông Tin Gia Định', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(291, 8, 'Cao đẳng Văn hóa Nghệ thuật và Du lịch Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(292, 8, 'Đại học Quốc tế Sài Gòn (The Saigon International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(293, 8, 'Cao đẳng nghề Việt Mỹ (Vietnamese American Training College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(294, 5, 'Đại học Công nghiệp Thực phẩm (HCMC University of Food Industry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(295, 5, 'Arena Multimedia', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(296, 7, 'Đại học Văn Hiến (Văn Hiến University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(297, 7, 'Đại Học Sunderland (The University of Sunderland)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(298, 7, 'Cao đẳng Kinh Tế TPHCM (College of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(299, 2, 'Hanoi - Đại học Quốc gia Hà Nội (Vietnam National University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(300, 2, 'Hanoi - Trường Đại học Khoa học Tự nhiên - Đại học Quốc gia Hà Nội (VNU University of Science)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(301, 2, 'Hanoi - Trường Đại học Khoa học Xã hội và Nhân văn - Đại học Quốc gia Hà Nội (VNU University of Social Sciences and Humanities)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(302, 2, 'Hanoi - Trường Đại học Ngoại ngữ - Đại học Quốc gia Hà Nội (VNU University of Languages and International Studies)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(303, 2, 'Hanoi - Trường Đại học Công nghệ - Đại học Quốc gia Hà Nội (VNU University of Engineering and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(304, 2, 'Hanoi - Trường Đại học Kinh tế - Đại học Quốc gia Hà Nội (VNU University of Economics and Business)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(305, 2, 'Hanoi - Trường Đại học Giáo dục - Đại học Quốc gia Hà Nội (VNU University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(306, 2, 'Hanoi - Trường Đại học Việt - Nhật - Đại học Quốc gia Hà Nội (VNU Vietnam Japan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(307, 2, 'Hanoi - Trường Đại học Y Dược - Đại học Quốc gia Hà Nội (VNU University of Medicine and Pharmacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(308, 2, 'Hanoi - Trường Đại học Luật - Đại học Quốc gia Hà Nội (VNU University of Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(309, 2, 'Hanoi - Trường Quốc tế - Đại học Quốc gia Hà Nội (VNU International School)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(310, 2, 'Hanoi - Trường Quản trị và Kinh doanh - Đại học Quốc gia Hà Nội (VNU Hanoi School of Business and Management)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(311, 2, 'Hanoi - Trường Khoa học liên ngành và Nghệ thuật - Đại học Quốc gia Hà Nội (VNU School of Interdisciplinary Sciences and Arts)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(312, 2, 'Hanoi - Khoa Quốc tế Pháp ngữ - Đại học Quốc gia Hà Nội (International Francophone Institute)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(313, 2, 'Hanoi - Đại học Hà Nội + LaTrobe (Hanoi University + LaTrobe)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(314, 2, 'Hanoi - Học viện Ngân hàng (Banking Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(315, 2, 'Hanoi - Đại học Bách khoa Hà Nội (Hanoi University of Science and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(316, 2, 'Hanoi - Đại học Thương mại (Vietnam University of Commerce)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(317, 2, 'Hanoi - Đại học Khoa học và Công nghệ Hà Nội (University of Science and Technology of Hanoi)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(318, 2, 'Hanoi - Truyền thông đa phương tiện ARENA (ARENA Multimedia)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(319, 2, 'Hanoi - Đại học Kinh doanh và Công nghệ (Hanoi University of Business and Technology (HUBT))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(320, 2, 'Hanoi - Đại học Kiến trúc Hà Nội (Hanoi Architectural University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(321, 2, 'Hanoi - Đại học Lao động Xã hội (University of Labour and Social Affairs)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(322, 2, 'Hanoi - Đại học Kinh tế Kỹ thuật Công nghiệp (University of Economic and Technical Industries)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(323, 2, 'Hanoi - Đại học Thủy lợi (Water Resources University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(324, 2, 'Hanoi - Đại học Công đoàn (Vietnam Trade Union University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(325, 2, 'Hanoi - Học viện Quân y (Vietnam Military Medical University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(326, 2, 'Hanoi - Đại học Đại Nam (Dai Nam University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(327, 2, 'Hanoi - Học viện Thanh Thiếu niên Việt Nam (Vietnam Youth Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(328, 2, 'Hanoi - Đại học Công nghiệp Việt Hung (Viet Hung Industrial University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(329, 2, 'Hanoi - Đại học Sư phạm Nghệ thuật Trung ương Hà Nội (National University of Art Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(330, 2, 'Hanoi - Đại học Tài chính Ngân hàng Hà Nội (Financial and Banking University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(331, 2, 'Hanoi - Đại học Công nghệ và Quản lý Hữu nghị (Huu Nghi University of Technology and Management)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(332, 2, 'Hanoi - Đại học Tài nguyên và Môi trường Hà Nội (Hanoi University of Natural Resources and Environment)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(333, 2, 'Hanoi - Đại học Y Hà Nội (Hanoi Medical University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(334, 2, 'Hanoi - Đại học Mỹ thuật Việt Nam (Vietnam University of Fine Arts)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(335, 2, 'Hanoi - Học viện Nông nghiệp Việt Nam (VNUA) (Vietnam University of Agriculture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(336, 2, 'Hanoi - University College London (UCL) (University College London (UCL))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(337, 2, 'Hanoi - Trường cao đẳng du lịch Hà Nội (Hanoi tourism college)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(338, 2, 'Hanoi - Cao đẳng Y Hà Nội (Hanoi Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(339, 1, 'Hanoi - Đại học Ngoại thương (Foreign Trade University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(340, 1, 'Hanoi - Học viện Ngoại giao (Diplomatic Academy of Vietnam)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(341, 1, 'Hanoi - Học viện Báo chí Tuyên truyền (Academy of Journalism and Communication)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(342, 1, 'Hanoi - Đại học Sư phạm Hà Nội (Hanoi National University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(343, 1, 'Hanoi - Đại học Luật Hà Nội (Hanoi Law University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(344, 1, 'Hanoi - Đại học FPT (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(345, 1, 'Hanoi - Học viện Tài chính (Academy of Finance)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(346, 1, 'Hanoi - British University Vietnam (British University Vietnam)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(347, 1, 'Hanoi - Đại học Mỹ thuật Công nghiệp (Industrial Fine Art University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(348, 1, 'Hanoi - Học viện Công nghệ Bưu chính Viễn thông (Posts and Telecommunications Institute of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(349, 1, 'Hanoi - Đại học Công nghệ Giao thông vận tải (University of Transport Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(350, 1, 'Hanoi - Đại học Dược Hà Nội (Hanoi University of Pharmacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(351, 1, 'Hanoi - Đại học Điện lực (Electric Power University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(352, 1, 'Hanoi - Đại học Lâm nghiệp (Vietnam Forestry University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(353, 1, 'Hanoi - Học viện An ninh Nhân dân (People\'s Police Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(354, 1, 'Hanoi - Học viện Hành chính Quốc gia (National Academy of Public Administration)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(355, 1, 'Hanoi - Học viện Y Dược học cổ truyền Việt Nam (Vietnam University of Traditional Medicine)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(356, 1, 'Hanoi - Đại học Giao thông vận tải (University of Communications and Transport)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(357, 1, 'Hanoi - Đại học Nội vụ Hà Nội (University of Home Affairs)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(358, 1, 'Hanoi - Đại học Y tế Công cộng (Hanoi School Of Public Health)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(359, 1, 'Hanoi - Đại học Nguyễn Trãi ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(360, 1, 'Hanoi - Đại học Phenikaa ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(361, 1, 'Hanoi - Cao đẳng nghề Bách Khoa Hà Nội (Hanoi Vocational College of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(362, 1, 'Hanoi - Cao đẳng y tế Hà Đông (Hadong Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(363, 1, 'Hanoi - Cao đẳng y tế Bạch Mai ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(364, 1, 'Hanoi - Học viện Tòa Án (Vietnam Court Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(365, 1, 'Hanoi - Swinburne Vietnam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(366, 1, 'Hanoi - Greenwich Vietnam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(367, 1, 'Hanoi - Cao đẳng Y tế Hà Nội (Hanoi Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(368, 3, 'Hanoi - Đại học Kinh tế Quốc dân (National Economics University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(369, 3, 'Hanoi - Đại học Thăng Long (Thang Long University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(370, 3, 'Hanoi - Đại học Văn hóa Hà Nội (Hanoi University Of Culture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(371, 3, 'Hanoi - Học viện Âm nhạc Quốc gia Việt Nam (Vietnam National Academy of Music)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(372, 3, 'Hanoi - Đại học Sư phạm Thể dục thể thao Hà nội ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(373, 3, 'Hanoi - Đại học Hòa Bình (Hoa Binh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(374, 3, 'Hanoi - Viện Đại học Mở Hà Nội (Hanoi Open University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(375, 3, 'Hanoi - Học viện Chính sách và Phát triển (Academy of Policy and Development)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(376, 3, 'Hanoi - Học viện Quản lý Giáo dục (National Institute of Education Management)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(377, 3, 'Hanoi - Đại học Mỏ Địa chất Hà Nội (Hanoi University of Mining and Geology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(378, 3, 'Hanoi - Học viện Khoa học Quân sự (Military Science Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(379, 3, 'Hanoi - Đại học Xây dựng (National University of Civil Engineering)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(380, 3, 'Hanoi - Học viện Kỹ thuật Mật mã (Academy of Crytography Techniques)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(381, 3, 'Hanoi - Đại học Công nghiệp Hà Nội (Hanoi University of Industry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(382, 3, 'Hanoi - Đại học Sân khấu Điện ảnh ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(383, 3, 'Hanoi - Đại học Đông Đô (Dong Do University of Science and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(384, 3, 'Hanoi - Đại học Quốc tế Bắc Hà ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(385, 3, 'Hanoi - Đại học Thành Đô ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(386, 3, 'Hanoi - Đại học Hàng Hải (Vietnam Maritime University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(387, 3, 'Hanoi - Cao đẳng Y dược Thanh Hóa  (Thanh Hoa Medical college)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(388, 3, 'Hanoi - Cao đẳng Cộng đồng Hà Nội (Hanoi Community College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(389, 3, 'Hanoi - Đại học Y Dược Hải Phòng (Hai Phong Medical University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(390, 3, 'Hanoi - Đại học Khoa học Thái Nguyên (Thai Nguyen University of Sciences (TNUS))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(391, 3, 'Hanoi - Đại học Phương Đông (Phuong Dong University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(392, 3, 'Hanoi - Cao Đẳng Sư Phạm Hà Nội (Hanoi College of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(393, 3, 'Hanoi - Học viện Phụ nữ Việt Nam (Vietnam Woman\'s Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(394, 3, 'Hanoi - Vin University', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(395, 3, 'Hanoi - Đại học Kiểm sát Hà Nội (Hanoi Procuratorate University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(396, 3, 'Hanoi - Đại học Quốc tế RMIT (RMIT University (Hanoi))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(397, 2, 'Hanoi - Khoa Quốc Tế - Đại học Quốc Gia Hà Nội (International School - VNU, Hanoi)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(398, 2, 'Hanoi - Đại học Khoa Học Xã hội và Nhân văn - ĐHQGHN (University of Social Sciences and Humanities - Hanoi, VNU)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(399, 2, 'Hanoi - Đại học Ngoại Ngữ Hà Nội (University of Languages and International Studies - VNU)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(400, 2, 'Hanoi - Đại học Lao động Xã hội HN (University of Labour and Social Affairs)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(401, 2, 'Hanoi - Đại học Nông nghiệp Hà Nội (Hanoi University of Agriculture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(402, 1, 'Hanoi - Đại học Sư phạm (National University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(403, 1, 'Hanoi - Đại học FPT HN (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(404, 1, 'Hanoi - Học viện Công nghệ Bưu chính Viễn thông HN (Posts and Telecommunications Institute of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(405, 1, 'Hanoi - Đại học Giao thông vận tải HN (University of Communications and Transport)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(406, 1, 'Hanoi - Đại học Thành Tây', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(407, 1, 'Hanoi - Đại học Greenwich Hà Nội', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(408, 1, 'Hanoi - Đại học Swinburne Việt Nam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(409, 1, 'Hanoi - Học viện Tòa án Hà Nội (Vietnam Court Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(410, 1, 'Hanoi - Trung Cấp Giao Thông Vận Tải', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(411, 3, 'Hanoi - VinUniversity', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(412, 3, 'Hanoi - Học viện Phụ nữ Việt Nam (Vietnam Women\'s Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(413, 3, 'Hanoi - Gap year after highschool in North region (exclude Hanoi)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(414, 6, 'HCMC - Đại học Kinh tế (University of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(415, 6, 'HCMC - Đại học Khoa học Xã hội và Nhân văn (University of Social Sciences and Humanities)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(416, 6, 'HCMC - Đại học Quốc tế (International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(417, 6, 'HCMC - Đại học Hoa Sen (Hoa Sen University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(418, 6, 'HCMC - Đại học Y Dược (Ho Chi Minh University of Medicine and Pharmacy) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(419, 6, 'HCMC - Đại học Công nghệ (HUTECH University HCM) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(420, 6, 'HCMC - Đại học Kiến trúc (Ho Chi Minh City University of Architecture) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(421, 6, 'HCMC - Đại học Y Pham Ngoc Thach (Pham Ngoc Thach University of Medicine) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(422, 6, 'HCMC - Đại học Thủy lợi (Thuyloi University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(423, 6, 'HCMC - Đại học Lạc Hồng (Lac Hong University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(424, 6, 'HCMC - Đại học Sài Gòn (Saigon University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(425, 6, 'HCMC - Cao đẳng kinh tế đối ngoại (College of Foreign Economic Relations) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(426, 6, 'HCMC - Đại học Pháp (French University - VietNam national university (HCM)) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(427, 6, 'HCMC - Đại học Hồng Đức (Hong Duc Medical School) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(428, 6, 'HCMC - Đại học Troy (Troy University (HCM)) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(429, 6, 'HCMC - Đại học Tân Tạo (Tan Tao University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(430, 6, 'HCMC - Học viện hàng không (Vietnam Aviation Academy) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(431, 6, 'HCMC - Nhạc viện (Conservatory of Ho Chi Minh City) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(432, 6, 'HCMC - Đại học Mỹ Thuật (University of arts) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(433, 6, 'HCMC - Trường trung cấp du lịch & khách sạn Saigontourist - Saigontourist Hospitality College ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(434, 6, 'HCMC - Khoa Y - Đại học Quốc gia ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(435, 6, 'HCMC - Đại học Tài chính - Kế Toán ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(436, 6, 'HCMC - Đại học Gia Định ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(437, 6, 'HCMC - Cao đẳng Kinh tế - Kỹ thuật Vinatex TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02');
INSERT INTO `uni_mapping` (`uni_id`, `entity_id`, `uni_name`, `created_at`, `updated_at`) VALUES
(438, 6, 'HCMC - Cao đẳng Kinh tế TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(439, 6, 'HCMC - Cao đẳng Kỹ thuật Cao Thắng ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(440, 6, 'HCMC - Cao đẳng Tài chính Hải quan ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(441, 6, 'HCMC - Cao đẳng Bách Việt (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(442, 6, 'HCMC - Cao đẳng Đại Việt Sài Gòn (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(443, 6, 'HCMC - Đại học Du lịch Sài Gòn (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(444, 6, 'HCMC - Học viện doanh nhân LP Việt Nam ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(445, 6, 'HCMC - Trường Quản Trị Khách Sạn và Du lịch Vatel ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(446, 6, 'HCMC - Cao đẳng Du lịch Sài Gòn ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(447, 6, 'HCMC - Đại học Quản lý và Công nghệ TP. Hồ Chí Minh (University of Management and Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(448, 6, 'HCMC - Đại học Western Sydney - Việt Nam (Western Sydney University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(449, 5, 'HCMC - Đại học Ngoại thương (Foreign Trade University - HCMC)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(450, 5, 'HCMC - Đại học Ngân hàng (Banking University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(451, 5, 'HCMC - Đại học Ngoại ngữ - Tin học TP. Hồ Chí Minh (University of Foreign Languages & Information Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(452, 5, 'HCMC - Đại học Tài Chính Marketing (University of Finance and Marketing)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(453, 5, 'HCMC - Đại học Sư phạm (University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(454, 5, 'HCMC - Greenwich Việt Nam - Cơ sở TP.HCM (University of Greenwich Vietnam - HCMC Campus)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(455, 5, 'HCMC - Swinburne Việt Nam - Cơ sở TP.HCM (Swinburne Vietnam - HCMC Campus)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(456, 5, 'HCMC - Đại học Công nghiệp (Industry University - HCMC)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(457, 5, 'HCMC - Đại học Hồng Bàng (Hong Bang University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(458, 5, 'HCMC - Đại học Công Thương (HCMC University of Industry and Trade)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(459, 5, 'HCMC - Đại học Tài nguyên và Môi trường (HCMC University of Natural Resources and Environment)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(460, 5, 'HCMC - Đại học Giao thông vận tải (University of Transport and Communication - Campus II)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(461, 5, 'HCMC - Học viện công nghệ bưu chính viễn thông (Posts and Telecommunications Institute of Technology) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(462, 5, 'HCMC - ERC International', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(463, 5, 'HCMC - THPT Quốc tế Việt Úc (Saigon International College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(464, 5, 'HCMC - Đại học Vinh (Vinh University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(465, 5, 'HCMC - Học viện kĩ thuật mật mã (Academy of Crytography Techniques) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(466, 5, 'HCMC - Đại học Hùng Vương (Hung Vuong university) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(467, 5, 'HCMC - Trường Đại học kinh doanh quốc tế - University of Business International Studies (UBIS) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(468, 5, 'HCMC - Trường đại học Dầu khí Việt Nam (PetroVietnam University - PVU)   ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(469, 5, 'HCMC - Broward College ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(470, 5, 'HCMC - Đại học Văn Hiến (Văn Hiến University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(471, 5, 'HCMC - Học viện Cảnh sát Nhân dân ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(472, 5, 'HCMC - Đại học Lao động - Xã hội ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(473, 5, 'HCMC - ĐH Sư phạm Thể dục Thể thao  ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(474, 5, 'HCMC - Cao đẳng Giao thông Vận tải  ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(475, 5, 'HCMC - Cao đẳng Công thương  ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(476, 5, 'HCMC - Cao đẳng Sư phạm Trung ương TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(477, 5, 'HCMC - Cao đẳng Văn hóa Nghệ thuật TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(478, 5, 'HCMC - Cao đẳng Kỹ thuật Công nghệ Vạn Xuân (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(479, 5, 'HCMC - Cao đẳng Kinh tế - Công nghệ TP.HCM (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(480, 5, 'HCMC - Cao đẳng Kinh tế Kỹ thuật Miền Nam (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(481, 5, 'HCMC - Cao đẳng Y tế Pasteur ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(482, 5, 'HCMC - Cao đẳng Viễn Đông ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(483, 5, 'HCMC - Học viện Cán bộ TP. Hồ Chí Minh (Ho Chi Minh Cadre Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(484, 7, 'HCMC - Đại học Kinh tế- Luật (University of Economics And Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(485, 7, 'HCMC - Đại học Luật (University of Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(486, 7, 'HCMC - Đại học Sư phạm Kỹ thuật (University of Technology and Education HCM)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(487, 7, 'HCMC - Đại học Khoa học Tự nhiên (University of Science)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(488, 7, 'HCMC - Đại học Mở (Open University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(489, 7, 'HCMC - Đại học Công nghệ Thông tin (HCMC University of Information Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(490, 7, 'HCMC - Đại học Đồng Nai (Dong Nai University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(491, 7, 'HCMC - Đại học Nông Lâm (HCMC University of Agriculture and Forestry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(492, 7, 'HCMC - Đại học Thủ Dầu Một (Thu Dau Mot University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(493, 7, 'HCMC - Đại học Quốc tế Miền Đông (Eastern International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(494, 7, 'HCMC - Đại học Việt Đức (Vietnam - Germany University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(495, 7, 'HCMC - Đại học Công nghệ  Đồng Nai', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(496, 7, 'HCMC - Đại học Kinh tế Kỹ thuật Bình Dương', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(497, 7, 'HCMC - Đại học Bình Dương', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(498, 7, 'HCMC - Đại học Lạc Hồng Đồng Nai', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(499, 7, 'HCMC - Đại học Công nghệ Miền Đông', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(500, 7, 'HCMC - Đại học Lâm Nghiệp', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(501, 7, 'HCMC - Cao đẳng Công Nghệ Thủ Đức TP.HCM (HCMC College of Technology Thu Duc)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(502, 7, 'HCMC - Đại học Sunderland (Sunderland University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(503, 8, 'HCMC - Đại học Văn Lang (Van Lang University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(504, 8, 'HCMC - Đại học RMIT Hồ Chí Minh (RMIT Ho Chi Minh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(505, 8, 'HCMC - Đại học Tôn Đức Thắng (Ton Duc Thang University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(506, 8, 'HCMC - Đại học Bách Khoa (University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(507, 8, 'HCMC - Đại học Kinh tế Tài chính (University of Economics and Finance)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(508, 8, 'HCMC - Đại học Nguyễn Tất Thành (Nguyen Tat Thanh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(509, 8, 'HCMC - Đại học công nghệ Sài Gòn (Saigontech) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(510, 8, 'HCMC - Đại học Văn hóa (Ho Chi Minh City University of Culture) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(511, 8, 'HCMC - Đại học Cảnh Sát Nhân Dân (People\'s Police University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(512, 8, 'HCMC - Cao đẳng Việt Mỹ (American Polytechnic College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(513, 8, 'HCMC - Học viện hành chính quốc gia (Ho Chi Minh National Academy of Politics and Public Administration) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(514, 8, 'HCMC - Đại học An Ninh nhân dân ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(515, 8, 'HCMC - ĐH Sân khấu Điện ảnh ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(516, 8, 'HCMC - Đại học Trần Đại Nghĩa (Tran Dai Nghia University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(517, 8, 'HCMC - Cao đẳng BC Công nghệ và Quản trị doanh nghiệp ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(518, 8, 'HCMC - Cao đẳng Điện lực TP.HCM ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(519, 8, 'HCMC - Cao đẳng Kinh tế Kỹ thuật TP. Hồ Chí Minh ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(520, 8, 'HCMC - Cao đẳng Phát thanh Truyền hình 2 ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(521, 8, 'HCMC - Cao đẳng Xây dựng số 2 ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(522, 8, 'HCMC - Cao đẳng Công nghệ thông tin TP.HCM (*) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(523, 8, 'HCMC - Cao đẳng Phương Nam ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(524, 8, 'HCMC - Đại học Kinh Tế - Kỹ Thuật Công nghiệp University of Economic and Technical Industries. ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(525, 8, 'HCMC - Đại học Fulbright (Fulbright University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(526, 8, 'HCMC - Cao đẳng Y Dược Sài Gòn (Sai Gon Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(527, 8, 'HCMC - Đại học Tư thục Quốc tế Sài Gòn (Saigon International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(528, 8, 'HCMC - Viện đào tạo quốc tế đại học Nguyễn Tất Thành (Nguyen Tat Thanh Institute of International Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(529, 8, 'HCMC - Cao đẳng Quốc tế Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(530, 8, 'HCMC - Đại Học Tư Thục Công Nghệ Thông Tin Gia Định', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(531, 8, 'HCMC - Cao đẳng Văn hóa Nghệ thuật và Du lịch Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(532, 8, 'HCMC - Đại học Quốc tế Sài Gòn (The Saigon International University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(533, 8, 'HCMC - Cao đẳng nghề Việt Mỹ (Vietnamese American Training College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(534, 5, 'HCMC - Đại học Công nghiệp Thực phẩm (HCMC University of Food Industry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(535, 5, 'HCMC - Arena Multimedia', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(536, 7, 'HCMC - Đại học Văn Hiến (Văn Hiến University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(537, 7, 'HCMC - Đại Học Sunderland (The University of Sunderland)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(538, 7, 'HCMC - Cao đẳng Kinh Tế TPHCM (College of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(539, 4, 'Da Nang - Đại học Kinh tế Đà Nẵng (Da Nang University of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(540, 4, 'Da Nang - Đại học Ngoại ngữ Đà Nẵng (Da Nang College of Foreign Languages)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(541, 4, 'Da Nang - Đại học Bách khoa Đà Nẵng (Da Nang University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(542, 4, 'Da Nang - Viện Nghiên Cứu & Đào Tạo Việt - Anh Đà Nẵng', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(543, 4, 'Da Nang - Đại học Duy Tân (Duy Tan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(544, 4, 'Da Nang - Đại học Ngoại Ngữ - ĐH Huế (Hue University of Foreign Languages) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(545, 4, 'Da Nang - Đại học Sư phạm Đà Nẵng (Da Nang College of Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(546, 4, 'Da Nang - Đại học Đà Nẵng Phân hiệu tại Kontum (Da Nang University Branch at Kontum) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(547, 4, 'Da Nang - Đại học Kỹ Thuật Y Dược Đà Nẵng (Danang University of Medical Technique) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(548, 4, 'Da Nang - Đại học FPT Đà Nẵng (Danang FPT University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(549, 4, 'Da Nang - Đại học Đông Á  (Danang Dong A University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(550, 4, 'Da Nang - Đại học Kiến trúc Đà Nẵng (Danang Architecture University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(551, 4, 'Da Nang - Đại học Kỹ Thuật Y Dược (Danang University of Medical Technique) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(552, 4, 'Da Nang - Cao đẳng Công Nghệ - ĐH Đà Nẵng (Danang College of Industry) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(553, 4, 'Da Nang - Cao đẳng Công Nghệ Thông Tin - ĐH Đà Nẵng (Danang College of Information & Technology) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(554, 4, 'Da Nang - Cao đẳng Công Nghệ Thông Tin Hữu Nghị Việt Hàn (Danang College of Information & Technology Vietnam-Korean) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(555, 4, 'Da Nang - Cao đẳng Công Nghệ Và Kinh Doanh Việt Tiến (Danang College of Industry & Business Viet Tien) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(556, 4, 'Da Nang - Cao đẳng Dân Lập Kinh Tế Kỹ Thuật Đông Du Đà Nẵng (Danang College of Economic & Technology Dong Du) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(557, 4, 'Da Nang - Cao đẳng Giao Thông Vận Tải II (Danang College of Transport) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(558, 4, 'Da Nang - Cao đẳng Kinh Tế - Kế Hoạch Đà Nẵng (Danang College of Economic) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(559, 4, 'Da Nang - Cao đẳng Lạc Việt (Danang Lac Viet College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(560, 4, 'Da Nang - Cao đẳng Lương Thực Thực Phẩm (Danang College of Food) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(561, 4, 'Da Nang - Cao đẳng Phương Đông - Đà Nẵng (Danang Phuong Dong College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(562, 4, 'Da Nang - Cao đẳng Thương Mại Đà Nẵng (Danang College of Commerce) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(563, 4, 'Da Nang - Cao đẳng Tư Thục Đức Trí - Đà Nẵng (Danang Duc Tri College) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(564, 4, 'Da Nang - Cao đẳng Công Nghiệp Huế (Hue College of Industry) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(565, 4, 'Da Nang - Cao đẳng Sư Phạm Thừa Thiên Huế (Hue College of Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(566, 4, 'Da Nang - Cao đẳng Xây Dựng Công Trình Đô Thị - Cơ Sở Huế (Hue College of Urban Construction Engineering) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(567, 4, 'Da Nang - Cao đẳng Y Tế Huế (Hue College of Medicine) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(568, 4, 'Da Nang - Đại học Khoa Học - ĐH Huế (Hue University of Science) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(569, 4, 'Da Nang - Đại học Kinh Tế - ĐH Huế (Hue University of Economic) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(570, 4, 'Da Nang - Đại học Nghệ Thuật - ĐH Huế (Hue University of Arts) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(571, 4, 'Da Nang - Đại học Nông Lâm - ĐH Huế (Hue University of Agriculture and Forestry) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(572, 4, 'Da Nang - Đại học Phú Xuân - Huế (Hue Phu Xuan University) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(573, 4, 'Da Nang - Đại học Sư Phạm - ĐH Huế (Hue University of Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(574, 4, 'Da Nang - Đại học Y Dược - ĐH Huế (Hue University of Medical) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(575, 4, 'Da Nang - Học viện Âm Nhạc Huế (Hue Academy of Music) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(576, 4, 'Da Nang - Đại học Huế - Khoa Du Lịch (Hue University - Faculty of Tourism) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(577, 4, 'Da Nang - Đại học Huế - Khoa Giáo Dục Thể Chất (Hue University - Faculty of Physical Education) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(578, 4, 'Da Nang - Đại học Huế - Khoa Luật (Hue University - Faculty of Law) ()', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(579, 9, 'Cantho - Đại Học Cần Thơ (Can Tho University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(580, 9, 'Cantho - Đại học Y Dược Cần Thơ (Can Tho University of Medicine and Phamacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(581, 9, 'Cantho - Đại Học Nam Cần Thơ (Nam Can Tho University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(582, 9, 'Cantho - Đại học Võ Trường Toản (Vo Truong Toan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(583, 9, 'Cantho - Đại học Kỹ thuật công nghệ Cần Thơ (Can Tho University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(584, 9, 'Cantho - Đại học Tây Đô (Tay Do University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(585, 9, 'Cantho - Đại học Greenwich (Greenwich University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(586, 9, 'Cantho - Cao đẳng Cần Thơ (Can Tho College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(587, 9, 'Cantho - Cao đẳng Cơ điện tử vầ Nông nghiệp Nam Bộ (Southern College for Engineering and Agriculture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(588, 9, 'Cantho - Cao đẳng Kinh tế Kỹ thuật Cần Thơ (Can Tho Technical Economic College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(589, 9, 'Cantho - Cao đẳng Nghề Cần Thơ (Can Tho Vocational College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(590, 9, 'Cantho - Cao đẳng Nghề CNTT Ispace (Ispace College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(591, 9, 'Cantho - Cao đẳng Nghề Việt Mỹ (American Polytechnic College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(592, 9, 'Cantho - Cao đẳng Y tế Cần Thơ (Can Tho Medical College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(593, 9, 'Cantho - Cao đẳng nghề Du lịch Cần Thơ (Can Tho Tourism College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(599, 2, 'Hanoi - Trường Đại học Kinh tế - Đại học Quốc gia Hà Nội (VNU University of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(655, 1, 'Hanoi - Đại học Nguyễn Trãi', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(656, 1, 'Hanoi - Đại học Phenikaa', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(659, 1, 'Hanoi - Cao đẳng y tế Bạch Mai', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(668, 3, 'Hanoi - Đại học Sư phạm Thể dục thể thao Hà nội', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(678, 3, 'Hanoi - Đại học Sân khấu Điện ảnh', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(680, 3, 'Hanoi - Đại học Quốc tế Bắc Hà', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(681, 3, 'Hanoi - Đại học Thành Đô', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(683, 3, 'Hanoi - Cao đẳng Y dược Thanh Hóa (Thanh Hoa Medical college)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(688, 3, 'Hanoi - Cao Đẳng Sư Phạm Hà Nội (Hanoi College of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(696, 6, 'HCMC - Đại học Y Dược (Ho Chi Minh University of Medicine and Pharmacy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(697, 6, 'HCMC - Đại học Công nghệ (HUTECH University HCM)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(698, 6, 'HCMC - Đại học Kiến trúc (Ho Chi Minh City University of Architecture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(699, 6, 'HCMC - Đại học Y Pham Ngoc Thach (Pham Ngoc Thach University of Medicine)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(700, 6, 'HCMC - Đại học Thủy lợi (Thuyloi University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(701, 6, 'HCMC - Đại học Lạc Hồng (Lac Hong University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(702, 6, 'HCMC - Đại học Sài Gòn (Saigon University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(703, 6, 'HCMC - Cao đẳng kinh tế đối ngoại (College of Foreign Economic Relations)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(704, 6, 'HCMC - Đại học Pháp (French University - VietNam national university (HCM))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(705, 6, 'HCMC - Đại học Hồng Đức (Hong Duc Medical School)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(706, 6, 'HCMC - Đại học Troy (Troy University (HCM))', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(707, 6, 'HCMC - Đại học Tân Tạo (Tan Tao University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(708, 6, 'HCMC - Học viện hàng không (Vietnam Aviation Academy)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(709, 6, 'HCMC - Nhạc viện (Conservatory of Ho Chi Minh City)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(710, 6, 'HCMC - Đại học Mỹ Thuật (University of arts)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(711, 6, 'HCMC - Trường trung cấp du lịch & khách sạn Saigontourist - Saigontourist Hospitality College', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(712, 6, 'HCMC - Khoa Y - Đại học Quốc gia', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(713, 6, 'HCMC - Đại học Tài chính - Kế Toán', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(714, 6, 'HCMC - Đại học Gia Định', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(715, 6, 'HCMC - Cao đẳng Kinh tế - Kỹ thuật Vinatex TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(716, 6, 'HCMC - Cao đẳng Kinh tế TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(717, 6, 'HCMC - Cao đẳng Kỹ thuật Cao Thắng', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(718, 6, 'HCMC - Cao đẳng Tài chính Hải quan', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(719, 6, 'HCMC - Cao đẳng Bách Việt', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(720, 6, 'HCMC - Cao đẳng Đại Việt Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(721, 6, 'HCMC - Đại học Du lịch Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(722, 6, 'HCMC - Học viện doanh nhân LP Việt Nam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(723, 6, 'HCMC - Trường Quản Trị Khách Sạn và Du lịch Vatel', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(724, 6, 'HCMC - Cao đẳng Du lịch Sài Gòn', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(732, 5, 'HCMC - Đại học FPT (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(740, 5, 'HCMC - Học viện công nghệ bưu chính viễn thông (Posts and Telecommunications Institute of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(742, 5, 'HCMC - THPT Quốc tế Việt Úc (Saigon International College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(743, 5, 'HCMC - Đại học Vinh (Vinh University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(744, 5, 'HCMC - Học viện kĩ thuật mật mã (Academy of Crytography Techniques)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(745, 5, 'HCMC - Đại học Hùng Vương (Hung Vuong university)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(746, 5, 'HCMC - Trường Đại học kinh doanh quốc tế - University of Business International Studies (UBIS)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(747, 5, 'HCMC - Trường đại học Dầu khí Việt Nam (PetroVietnam University - PVU)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(748, 5, 'HCMC - Broward College', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(750, 5, 'HCMC - Học viện Cảnh sát Nhân dân', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(751, 5, 'HCMC - Đại học Lao động - Xã hội', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(752, 5, 'HCMC - ĐH Sư phạm Thể dục Thể thao', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(753, 5, 'HCMC - Cao đẳng Giao thông Vận tải', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(754, 5, 'HCMC - Cao đẳng Công thương', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(755, 5, 'HCMC - Cao đẳng Sư phạm Trung ương TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(756, 5, 'HCMC - Cao đẳng Văn hóa Nghệ thuật TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(757, 5, 'HCMC - Cao đẳng Kỹ thuật Công nghệ Vạn Xuân', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(758, 5, 'HCMC - Cao đẳng Kinh tế - Công nghệ TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(759, 5, 'HCMC - Cao đẳng Kinh tế Kỹ thuật Miền Nam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(760, 5, 'HCMC - Cao đẳng Y tế Pasteur', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(761, 5, 'HCMC - Cao đẳng Viễn Đông', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(769, 7, 'HCMC - Đại học Đồng Nai (Dong Nai University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(774, 7, 'HCMC - Đại học Công nghệ Đồng Nai', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(788, 8, 'HCMC - Đại học công nghệ Sài Gòn (Saigontech)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(789, 8, 'HCMC - Đại học Văn hóa (Ho Chi Minh City University of Culture)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(791, 8, 'HCMC - Cao đẳng Việt Mỹ (American Polytechnic College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(792, 8, 'HCMC - Học viện hành chính quốc gia (Ho Chi Minh National Academy of Politics and Public Administration)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(793, 8, 'HCMC - Đại học An Ninh nhân dân', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(794, 8, 'HCMC - ĐH Sân khấu Điện ảnh', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(795, 8, 'HCMC - Đại học Trần Đại Nghĩa (Tran Dai Nghia University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(796, 8, 'HCMC - Cao đẳng BC Công nghệ và Quản trị doanh nghiệp', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(797, 8, 'HCMC - Cao đẳng Điện lực TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(798, 8, 'HCMC - Cao đẳng Kinh tế Kỹ thuật TP. Hồ Chí Minh', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(799, 8, 'HCMC - Cao đẳng Phát thanh Truyền hình 2', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(800, 8, 'HCMC - Cao đẳng Xây dựng số 2', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(801, 8, 'HCMC - Cao đẳng Công nghệ thông tin TP.HCM', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(802, 8, 'HCMC - Cao đẳng Phương Nam', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(803, 8, 'HCMC - Đại học Kinh Tế - Kỹ Thuật Công nghiệp University of Economic and Technical Industries.', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(809, 9, 'Cantho - Đại học FPT (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(823, 4, 'Danang - Đại học Kinh tế Đà Nẵng (Da Nang University of Economics)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(824, 4, 'Danang - Đại học Ngoại ngữ Đà Nẵng (Da Nang College of Foreign Languages)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(825, 4, 'Danang - Đại học Bách khoa Đà Nẵng (Da Nang University of Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(826, 4, 'Danang - Viện Nghiên Cứu & Đào Tạo Việt - Anh Đà Nẵng', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(827, 4, 'Danang - Đại học Duy Tân (Duy Tan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(828, 4, 'Danang - Đại học Ngoại Ngữ - ĐH Huế (Hue University of Foreign Languages)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(829, 4, 'Danang - Đại học Sư phạm Đà Nẵng (Da Nang College of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(830, 4, 'Danang - Đại học Đà Nẵng Phân hiệu tại Kontum (Da Nang University Branch at Kontum)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(831, 4, 'Danang - Đại học Kỹ Thuật Y Dược Đà Nẵng (Danang University of Medical Technique)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(832, 4, 'Danang - Đại học FPT Đà Nẵng (Danang FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(833, 4, 'Danang - Đại học Đông Á (Danang Dong A University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(834, 4, 'Danang - Đại học Kiến trúc Đà Nẵng (Danang Architecture University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(835, 4, 'Danang - Đại học Kỹ Thuật Y Dược (Danang University of Medical Technique)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(836, 4, 'Danang - Cao đẳng Công Nghệ - ĐH Đà Nẵng (Danang College of Industry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(837, 4, 'Danang - Cao đẳng Công Nghệ Thông Tin - ĐH Đà Nẵng (Danang College of Information & Technology)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(838, 4, 'Danang - Cao đẳng Công Nghệ Thông Tin Hữu Nghị Việt Hàn (Danang College of Information & Technology Vietnam-Korean)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(839, 4, 'Danang - Cao đẳng Công Nghệ Và Kinh Doanh Việt Tiến (Danang College of Industry & Business Viet Tien)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(840, 4, 'Danang - Cao đẳng Dân Lập Kinh Tế Kỹ Thuật Đông Du Đà Nẵng (Danang College of Economic & Technology Dong Du)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(841, 4, 'Danang - Cao đẳng Giao Thông Vận Tải II (Danang College of Transport)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(842, 4, 'Danang - Cao đẳng Kinh Tế - Kế Hoạch Đà Nẵng (Danang College of Economic)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(843, 4, 'Danang - Cao đẳng Lạc Việt (Danang Lac Viet College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(844, 4, 'Danang - Cao đẳng Lương Thực Thực Phẩm (Danang College of Food)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(845, 4, 'Danang - Cao đẳng Phương Đông - Đà Nẵng (Danang Phuong Dong College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(846, 4, 'Danang - Cao đẳng Thương Mại Đà Nẵng (Danang College of Commerce)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(847, 4, 'Danang - Cao đẳng Tư Thục Đức Trí - Đà Nẵng (Danang Duc Tri College)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(848, 4, 'Danang - Cao đẳng Công Nghiệp Huế (Hue College of Industry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(849, 4, 'Danang - Cao đẳng Sư Phạm Thừa Thiên Huế (Hue College of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(850, 4, 'Danang - Cao đẳng Xây Dựng Công Trình Đô Thị - Cơ Sở Huế (Hue College of Urban Construction Engineering)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(851, 4, 'Danang - Cao đẳng Y Tế Huế (Hue College of Medicine)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(852, 4, 'Danang - Đại học Khoa Học - ĐH Huế (Hue University of Science)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(853, 4, 'Danang - Đại học Kinh Tế - ĐH Huế (Hue University of Economic)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(854, 4, 'Danang - Đại học Nghệ Thuật - ĐH Huế (Hue University of Arts)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(855, 4, 'Danang - Đại học Nông Lâm - ĐH Huế (Hue University of Agriculture and Forestry)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(856, 4, 'Danang - Đại học Phú Xuân - Huế (Hue Phu Xuan University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(857, 4, 'Danang - Đại học Sư Phạm - ĐH Huế (Hue University of Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(858, 4, 'Danang - Đại học Y Dược - ĐH Huế (Hue University of Medical)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(859, 4, 'Danang - Học viện Âm Nhạc Huế (Hue Academy of Music)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(860, 4, 'Danang - Đại học Huế - Khoa Du Lịch (Hue University - Faculty of Tourism)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(861, 4, 'Danang - Đại học Huế - Khoa Giáo Dục Thể Chất (Hue University - Faculty of Physical Education)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(862, 4, 'Danang - Đại học Huế - Khoa Luật (Hue University - Faculty of Law)', '2025-08-28 08:48:02', '2025-08-28 08:48:02'),
(863, 5, 'HCMC - Đại học FPT HCM (FPT University)', '2025-08-28 08:48:02', '2025-08-28 08:48:02');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
-- Indexes for table `forms`
--
ALTER TABLE `forms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `form_fields`
--
ALTER TABLE `form_fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_form_id` (`form_id`),
  ADD KEY `idx_sort_order` (`sort_order`);

--
-- Indexes for table `form_responses`
--
ALTER TABLE `form_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_submission_id` (`submission_id`),
  ADD KEY `idx_field_id` (`field_id`);

--
-- Indexes for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_form_id` (`form_id`),
  ADD KEY `idx_submitted_at` (`submitted_at`);

--
-- Indexes for table `uni_mapping`
--
ALTER TABLE `uni_mapping`
  ADD PRIMARY KEY (`uni_id`),
  ADD KEY `idx_entity_id` (`entity_id`),
  ADD KEY `idx_uni_name` (`uni_name`);

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
-- AUTO_INCREMENT for table `forms`
--
ALTER TABLE `forms`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `form_fields`
--
ALTER TABLE `form_fields`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `form_responses`
--
ALTER TABLE `form_responses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `form_submissions`
--
ALTER TABLE `form_submissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `uni_mapping`
--
ALTER TABLE `uni_mapping`
  MODIFY `uni_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=864;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `form_fields`
--
ALTER TABLE `form_fields`
  ADD CONSTRAINT `form_fields_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `form_responses`
--
ALTER TABLE `form_responses`
  ADD CONSTRAINT `form_responses_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `form_submissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `form_responses_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `form_fields` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD CONSTRAINT `form_submissions_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `uni_mapping`
--
ALTER TABLE `uni_mapping`
  ADD CONSTRAINT `fk_uni_mapping_entity` FOREIGN KEY (`entity_id`) REFERENCES `entity` (`entity_id`) ON DELETE CASCADE;

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `fk_user_entity` FOREIGN KEY (`entity_id`) REFERENCES `entity` (`entity_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
