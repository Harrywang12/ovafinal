-- Seed data for lessons table
-- Run this in your Supabase SQL Editor

-- Clear existing lessons (optional, remove if you want to preserve existing data)
-- TRUNCATE public.lessons;

-- Serving Module
INSERT INTO public.lessons (title, content, module) VALUES
('Service Zone', 'The server must serve from behind the end line (baseline) and between the sideline extensions. The ball must be hit with one hand or arm after being tossed or released from the other hand. The server has 8 seconds after the referee''s whistle to execute the service.', 'Serving'),
('Service Execution', 'At the moment of the service hit, the server must not touch the court or the end line. After the hit, the server may step or land inside the court or outside the service zone. A jump serve is legal as long as the player takes off from behind the end line.', 'Serving'),
('Service Order', 'Each team must follow the service order recorded on the lineup sheet. A rotational fault occurs when a team serves out of order. If discovered, the team loses the rally and the rotation is corrected.', 'Serving'),
('Let Serve', 'A serve that touches the net and goes over is legal and play continues. The receiving team must be ready to play a let serve. This rule was changed in 2001 - previously a let serve was replayed.', 'Serving'),
('Service Faults', 'Common service faults include: violating the service order, ball landing out of bounds, ball touching a player before crossing the net, ball passing over/outside the antenna, server stepping on/over the end line before contact, and exceeding the 8-second limit.', 'Serving');

-- Blocking Module
INSERT INTO public.lessons (title, content, module) VALUES
('Block Definition', 'Blocking is the action of players close to the net to intercept the ball coming from the opponent''s side by reaching higher than the top of the net. Only front-row players are permitted to complete a block.', 'Blocking'),
('Block Contact', 'A block contact is not counted as a team hit. After a block, a team is entitled to three contacts to return the ball. The first hit after a block may be executed by any player, including the one who touched the ball during the block.', 'Blocking'),
('Collective Block', 'A collective block is executed by two or three players close to each other. It is completed when one of them touches the ball. If two or three players participate but only one touches the ball, one block contact is counted.', 'Blocking'),
('Back-Row Block Fault', 'A back-row player may not participate in a completed block. A back-row player commits a fault if they touch the ball above the net during blocking. Attempting to block is not a fault unless the ball is actually touched.', 'Blocking'),
('Blocking the Serve', 'It is forbidden to block an opponent''s service. This is a fault that results in a point and service for the serving team. The blocker must wait until the ball has been attacked before blocking.', 'Blocking');

-- Faults Module
INSERT INTO public.lessons (title, content, module) VALUES
('Four Hits', 'A team hits the ball four times before returning it. The block contact is not counted as a team hit, so a team may actually contact the ball four times if the first touch is a block.', 'Faults'),
('Assisted Hit', 'A player may not take support from a teammate or any structure to hit the ball. However, a player may hold or stop a teammate who is about to commit a fault (touch the net or cross the center line).', 'Faults'),
('Catch/Carry', 'The ball must not be caught and/or thrown. It can rebound in any direction. The ball must not be visibly come to rest on any part of a player''s body. Double contact is allowed on the first team contact.', 'Faults'),
('Net Touch', 'Contact with the net by a player is a fault only if it interferes with play. Interference includes: touching the net during action of playing the ball, or using the net for support/advantage.', 'Faults'),
('Center Line Penetration', 'Players may penetrate into the opponent''s court under the net as long as they do not interfere with the opponent''s play. Touching the opponent''s court with any part of the body above the feet is permitted if some part of the foot remains on or above the center line.', 'Faults');

-- Rotations Module
INSERT INTO public.lessons (title, content, module) VALUES
('Position at Service', 'At the moment the ball is hit by the server, each team must be positioned within its own court in rotational order. The positions are numbered 1-6, with 1 at right back and proceeding counterclockwise.', 'Rotations'),
('Positional Relationships', 'Each back-row player must be positioned further from the net than the corresponding front-row player. Each right-side player must be positioned further right than the center player of the same row.', 'Rotations'),
('After Service Hit', 'After the service hit, players may move and occupy any position on their court and free zone. There are no position restrictions after the serve is contacted.', 'Rotations'),
('Rotational Fault', 'A rotational fault occurs when a team is not in correct positional order at the moment of service. The team at fault loses the rally and positions are corrected.', 'Rotations'),
('Substitution and Rotation', 'A player entering the game must take the position of the player they replace in the rotation order. The rotation order is maintained throughout the set.', 'Rotations');

-- Libero Module
INSERT INTO public.lessons (title, content, module) VALUES
('Libero Definition', 'The Libero is a defensive specialist who wears a different colored jersey. The Libero may replace any back-row player. There can be two Liberos designated on the roster, but only one can be on the court at a time.', 'Libero'),
('Libero Restrictions', 'The Libero cannot: serve (except in some competitions), block or attempt to block, attack when the ball is entirely above the net, set in front of the attack line if a teammate attacks above the net.', 'Libero'),
('Libero Replacements', 'Libero replacements are not counted as regular substitutions. Replacements must occur when the ball is dead and before the whistle for service. The Libero may only be replaced by the player whom they replaced.', 'Libero'),
('Setting Restriction', 'If the Libero overhand finger sets in the front zone, the ball may not be attacked above the height of the net. A back-row set by the Libero has no restrictions.', 'Libero'),
('Injured Libero', 'If the Libero is injured and cannot continue, a team may redesignate a new Libero from players not on the court at the time of redesignation. The original Libero cannot return to play.', 'Libero');

-- Signals Module
INSERT INTO public.lessons (title, content, module) VALUES
('Point Signal', 'The referee raises the arm on the side of the team that won the rally, with hand open and fingers together pointing upward. The palm faces inward.', 'Signals'),
('Ball Out', 'The referee raises both forearms vertically with hands open and palms facing the body. This signal indicates the ball landed outside the court lines.', 'Signals'),
('Four Hits', 'The referee raises four fingers spread open, palm facing the scoring table. This indicates a team contacted the ball more than three times before returning it.', 'Signals'),
('Double Contact', 'The referee raises two fingers spread apart. This indicates a player hit the ball twice in succession or the ball touched various parts of their body successively.', 'Signals'),
('Net Touch', 'The referee touches the top of the net on the side of the player at fault. This indicates a player made illegal contact with the net during play.', 'Signals');

