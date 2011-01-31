//
// Drawing API: caller should call this function to get a drawing
// function, customized with the drawing options. Then call the
// drawing fuction with JSON feature lists.
//
// Options can be passed in via the dictionary argument. For example:
//
//    draw_fn = giraffe_draw_init({ "map_dom_id" : "some_id", ... })
//
// The result is something you can pass as the JSONP argument to the
// BLAT get API (i.e. API to retrieve array of features of a sequence
// from the server):
//
//    <script src="/headers/js/raphael-min.js"></script>
//    <script src="http://host/api/js/draw.js"></script>
//    <script>draw_fn = giraffe_draw_init({...})</script>
//    <script src="http://host/blat/8de36469..../default?jsonp=draw_fn">
//    </script>
//
// Available options are:
//
//  map_dom_id: ID of the DOM element that contains the map. Default
//  is "giraffe-draw-map"
//
//  fade_time: if non-zero, then highlight a feature will cause an
//  animated fade-in/out effect. Default is 0.
//
//  feature_opacity: opacity when feature is shown. if not 1.0, then
//  when feature is moused over or clicked on, the opacity will become
//  1.0. Default is 1.0.
//
//  map_width, map_height: default 640, 640.
//
function giraffe_draw_init(options) {

	var _debug = false;

    // Paper setup - not the final width, but how we will draw the
    // map, we will scale later on
	var map_width = 640;
	var map_height = 640;
	var cx = map_width/2;
	var cy = map_height/2;

    // Where to draw the map
    var map_dom_id = 'giraffe-draw-map';
    if ('map_dom_id' in options) {
        map_dom_id = options['map_dom_id'];
    }

    // Final size
    var final_map_width = 640;
    var final_map_height = 640;
    if ('map_width' in options) {
        final_map_width = parseInt(options['map_width'])
    }
    if ('map_height' in options) {
        final_map_height = parseInt(options['map_height'])
    }

	// Global plasmid info
	var plasmid_start = 90; // degrees

	// Loop radii
	var radius_spacing = 20; // spacing
	var plasmid_radius = 200;
	var inner_radius = plasmid_radius - radius_spacing; 
	var outer_radius = plasmid_radius + radius_spacing;
	var label_radius_offset = 0;

	// Feature visual properties
	var feature_width = 15;
	var enzyme_width = 25;
	var enzyme_weight = 1; // Restriction enzymes are drawn differently
	                       // This controls their "thickness" on the map
	var enzyme_bold_weight = 1.5*enzyme_weight; 
	var feature_opacity = 1.0;
	var enzyme_opacity = 1.0;
    if ('opacity' in options) {
	    feature_opacity = parseFloat(options['opacity']);
	    enzyme_opacity = parseFloat(options['opacity']);
    }
	var bold_opacity = 1.0;
	var head_width = 25;
	var head_length = 7;

	// Cutters to show
	var cutters_to_show = [1];

	// Animation properties
	var fade_time = 0;
    if ('fade_time' in options) {
        fade_time = parseInt(options['fade_time'])
    }

	// Overlaps
	var min_overlap_cutoff = -0.1;// in degrees
	var min_overlap_pct = 0.01;
	var min_overlap_feature_size = 0.5; // in degrees
	
	// Tic marks
	var tic_mark_length = 15;
	var tic_mark_radius = inner_radius - tic_mark_length/2;
	var tic_label_radius = tic_mark_radius - 1.5*tic_mark_length;

	// Table display
	var hide_enzyme_rows = true; // Hide rows for cutter types not shown

	// Colors
	var color_bg_text = "#aaa";
	var color_plasmid = "#000";
	var color_feature = "#f00";
	var color_primer  = "#090";
	var color_origin  = "#333";
	var color_enzyme  = "#00c";

	// Feature Types
	var ft = { 
		gene: "Gene",
		regulatory: "Regulatory",
		enzyme: "Enzyme",
		primer: "Primer",
		promoter: "Promoter",
		terminator: "Terminator",
		origin: "Origin",
		feature: "Feature",
		exact_feature: "Exact Feature"
	};

	///////////////////////////////////////////////////////////////////
	// Internals start here
	
	// SVG Object
	// For dealing with the SVG syntax
	var svg = {
		move: function (x, y) {
			return this.to_path(['M', x, y]);
		},
		arc: function (r, x, y) {
			return this.to_path(['A', r, r, 0, 0, 0, x, y]);
		},
		line: function (x, y) {
			return this.to_path(['L', x, y]);
		},
		close: function () {
			return 'z';
		},
		to_path: function (plist) {
			return plist[0] + plist.slice(1).join(' ');
		}
	};

	// Conversion Object
	// Groups conversions into handy section
	var convert = {
		pos_to_angle: function (p) {
			//     start at the top of the circle
			return plasmid_start - (p/seq_length) * 360;
		},
		seq_length_to_angle: function (l) {
			//     just like pos_to_angle, but without caring about the start
			return (l/seq_length) * 360;
		},
		angle_to_pos: function (a) {
			//     start at the top of the circle
			return Math.round(1 + ((seq_length - 1)/360) * ((360 + plasmid_start - a) % 360));
		},
		/* Angle a is in degrees from the horizontal, counterclockwise, and
		 * r is relative to the center of the paper */
		polar_to_rect: function (r, a) {
			var rect = {};
			rect.x = cx + r * Math.cos(Raphael.rad(a));
			// Coordinates increase as you go down, so y is flipped.
			rect.y = cy - r * Math.sin(Raphael.rad(a));
			return rect;
		}
	};


	///////////////////////////////////////////////////////////////////
	// Feature class
    //
    // Takes in a feature_list f:
    //   f[0] - name
    //   f[1] - start
    //   f[2] - end
    //   f[3] - type
    //
	function Feature(feature_list) {

		// Private data members, from the argument list
		var _name = feature_list[0];
		var _start = parseInt(feature_list[1]);
		var _end = parseInt(feature_list[2]);
		var _type = feature_list[3];
		var _clockwise = (_start <= _end);
		var _other_cutters = []; // only for enzymes;

		// Because we store the clockwise information in a separate variable,
		// ensure that start and end go clockwise (end > start), regardless
		// of what the original feature data was
		if (!_clockwise) {
			var _tmp = _start;
			_start = _end;
			_end = _tmp;
		}

		// Visual properties
		var _visible = true;
		var _labeled = true;

		// Type-based property selection
		var _color = color_feature;
		var _width = feature_width;
		var _draw_head = false;
		var _opacity = feature_opacity;
		var _opaque = false; // holds opacity for clicks
		switch(_type) {
			case ft.promoter:
			case ft.primer:
				_draw_head = true; // Promotors and primers are the only primer-colored
			case ft.terminator:   // features with heads
				_color = color_primer;
				break;
			case ft.regulatory:
			case ft.origin:
				_color = color_origin;
				break;
			case ft.enzyme:
				_color = color_enzyme;
				_width = enzyme_width;
				_opacity = enzyme_opacity;
				break;
			case ft.gene:
				_draw_head = true;
				break;
		}

		var _this = this; // another copy of the this pointer, to 
		              // work around a JavaScript bug that reassigns (this)
		              // improperly

		// Radius is public, unlike other properties, which are permanent
		this.radius = plasmid_radius; // Default to plasmid radius, can be changed
		                              // later on by other methods

		// Accessors for private properties set at creation
		this.name = function() { return _name; };
		this.start = function() { return _start; };
		this.end = function() { return _end; };
		this.type = function() { return _type; };
		this.clockwise = function() { return _clockwise; };
		this.visible = function() { return _visible; };
		this.labeled = function() { return _labeled; };
		// Check to see if label has been drawn yet
		this.label_drawn = function() { return _label_drawn; };
		this.cut_count = function() { return _other_cutters.length; };// gives 0 if not enzyme

		this.feature_set = function() { return _feature_set };

		// Mutator for other_cutters: only for enzymes
		this.set_other_cutters = function(c) {
			if (_type == ft.enzyme)
				_other_cutters = c;
		}

		// Calculated properties
		
		// Degree conversion, for overlap calculation:
		// for these functions, the sequence starts at 90 degrees and goes down.
		this.start_degrees = function() {
			var sd;
			// Take the minimum head size into account. Only need to do this 
			// when the head is drawn and pointing clockwise, to
			// "push the start back."
			if (_draw_head && _clockwise) { 
				sd = convert.pos_to_angle(_end) + _this.size_degrees();
			} else { // Headless feature, or head is pointing the wrong way.
				     // Just give its typical start position
				sd = convert.pos_to_angle(_start);
			}
			return sd;
		};

		this.end_degrees = function() {
			var ed;
			// Take the minimum head size into account. Only need to do this 
			// when the head is drawn and pointing counterclockwise, to 
			// "push the end forward."
			if (_draw_head && !_clockwise) { // Take the minimum head size into account
				ed = convert.pos_to_angle(_start) - _this.size_degrees();
			} else { // Headless feature, or head is pointing the wrong way.
				     // Just give its typical end position
				ed = convert.pos_to_angle(_end);
			}
			return ed;
		};

		this.size_degrees = function() {
			var szd; // size in degrees
			// Normal definition of size
			szd = convert.seq_length_to_angle(_this.end() - _this.start() + 1);

			// Head size: return this if it's bigger
			if (_draw_head) {
				// Convert the head length into degrees, just as you do
				// in the draw() method. Must recalcualte every time, as
				// radius may have changed
				var r_p = Math.sqrt(_this.radius*_this.radius + 
						head_length*head_length);
				var hszd = Raphael.deg(Math.asin(head_length/r_p));
				if (hszd > szd)
					szd = hszd;
			}

			return szd;
		};


		// Actions for interactivity
		var _bolder = function () {
			var sets = paper.set();
			sets.push(_feature_set);
			var props = {"opacity": bold_opacity, "font-weight": "bold" };

			// Cutters: make them thicker and highlight
			//          related examples
			if (_type == ft.enzyme) {
				props["stroke-width"] = enzyme_bold_weight;
				// Highlight other examples of this enzyme
				// if it's a multi-cutter
				for (var fx in _other_cutters) {
					sets.push(_other_cutters[fx].feature_set());
				}
			}

            if (fade_time) { sets.animate(props, fade_time); }
            else { sets.attr(props); }
		}

		var _lighter = function () {
			var sets = paper.set();
			sets.push(_feature_set);

			// Cutters: restore them and related examples to normal
			var props = {"opacity": _opacity, "font-weight":"normal"};
			if (_type == ft.enzyme) {
				props["stroke-width"] = enzyme_weight;
				// Highlight other examples of this enzyme
				// if it's a multi-cutter
				for (var fx in _other_cutters) {
					sets.push(_other_cutters[fx].feature_set());
				}
			}

            if (fade_time) { sets.animate(props, fade_time); }
            else { sets.attr(props); }
		}

		// Toggle solid/light upon click
		var _click = function (event) {
			if (_opaque) {
				_lighter();
				_opaque = false;
			} else {
				_bolder();
				_opaque = true;
			}
		};

		// Hovering: solid/light upon mouseover
		var _mouse_over = function (event) {
			if (!_opaque)
				_bolder();
		};
		var _mouse_up = function (event) {
			if (!_opaque)
				_lighter();
		};

		// The visual object to modify when accessing the feature.
		var _feature_set = paper.set();
		var _arrow_set = paper.set();

		var _label_set = paper.set();
		var _label_drawn = false;

		// Feature drawing
		this.draw = function () {


			// Convert from sequence positions to angles
			var a0 = convert.pos_to_angle(_start);
			var a1 = convert.pos_to_angle(_end);

			// Create the draw feature, a set which will have the head 
			// and arc pushed onto it as necessary.
			
			// Arrowhead drawing, if needed
			if (_draw_head) {

				// Arrow tip point lines up with a0 or a1 and it points
				// tangent to the circle.
				// We need to figure out how many radians the arrow takes up
				// in order to adjust a0 or a1 by that amount, and to set the 
				// base of the triangle even with that angle
				var r_p = Math.sqrt(_this.radius*_this.radius + 
						head_length*head_length);
				// "height" of the arrowhead, in degrees
				var a_b;
				var a_p = Raphael.deg(Math.asin(head_length/r_p));
				// Adjust the appropriate edge to compensate for the arrowhead
				if (_clockwise) {
					a_b = (a1 + a_p) % 360 ; // base angle
					a_p = a1;       // point angle
					a1  = a_b;      // adjust arc edge
				} else {
					a_b = (a0 - a_p) % 360 ; // base angle
					a_p = a0;       // point angle
					a0  = a_b;      // adjust arc edge
				}
				var xy_p = convert.polar_to_rect(_this.radius, a_p);
				
				// bottom and top points, rectangular
				var xy_b = convert.polar_to_rect(_this.radius - head_width/2.0, a_b);
				var xy_t = convert.polar_to_rect(_this.radius + head_width/2.0, a_b);

				// Unlike the arc, the head is traced with a line, and
				// then created entirely with the fill color
				var head = paper.path(svg.move(xy_p.x, xy_p.y) +
									  svg.line(xy_b.x, xy_b.y) +
									  svg.line(xy_t.x, xy_t.y) + 
									  svg.close());
				head.attr({"stroke-width": 0,
						   "fill":         _color});
				_arrow_set.push(head);
			}

			// Arc drawing
			if (a1 < a0 && _type != ft.enzyme) { 
				// Compensating for the head may have "taken up" all
				// the room on the plasmid, in which case no arc needs
				// to be drawn

				// Rectangular coordinates of the edges of the arc: 
				// arcs are drawn counterclockwise, even though the plasmid
				// sequence increases clockwise, so we flip the
				// indices
				var xy0 = convert.polar_to_rect(_this.radius, a1);
				var xy1 = convert.polar_to_rect(_this.radius, a0);

				// The arc has no fill-color: it's just a thick line
				var arc = paper.path(svg.move(xy0.x, xy0.y) +
									 svg.arc(_this.radius, xy1.x, xy1.y));
				arc.attr({"stroke-width": _width});

				_arrow_set.push(arc);
			} else if (_type == ft.enzyme) { 
				// Restriction enzymes get drawn on their own
				var xy0 = convert.polar_to_rect(_this.radius - enzyme_width/2.0, 
						(a0+a1)/2.0);
				var xy1 = convert.polar_to_rect(_this.radius + enzyme_width/2.0, 
						(a0+a1)/2.0);
				// Not really an arc, just a line, but left this way
				// for consistency
				var arc = paper.path(svg.move(xy0.x, xy0.y) +
									 svg.line(xy1.x, xy1.y));
				arc.attr({"stroke-width": enzyme_weight});
				arc.toBack();

				_arrow_set.push(arc);
			}

			_arrow_set.click(_click);
			_arrow_set.hover(_mouse_over, _mouse_up);

			_feature_set.push(_arrow_set);

			// Apply the feature-wide properties to the whole feature
			_feature_set.attr({"stroke":         _color,
			                   "stroke-linecap": "butt",
			                   "opacity":        _opacity,
			                   "title":          _name});

		} // END Feature::draw()

		// Draw the label associated with that feature
		this.draw_label = function (r_l) {
			// Don't bother unless we need to
			if (!_visible || !_labeled) 
				return;

			if (_label_drawn)
				_this.clear_label();

			// Figure out the center of the feature
			var a_c = (_this.start_degrees() + _this.end_degrees()) / 2.0;
			var xy0 = convert.polar_to_rect(_this.radius, a_c);
			
			// Figure out the label position: divide the grid up into eight
			// sections
			var section_size = 45; // degrees
			var section = Math.floor((plasmid_start - a_c) / section_size);
			var section_angle = plasmid_start - section_size/2.0 - section*section_size;

			y_shift = label_heights[section];
			
			var xy1 = convert.polar_to_rect(r_l, section_angle);
			if (xy1.y > cy) { // Lower half: add below
				xy1.y += y_shift;
			} else { // Upper half: add above
				xy1.y -= y_shift;
			}

			// Draw the line to the label position
			var label_line = paper.path(svg.move(xy0.x, xy0.y) +
										svg.line(xy1.x, xy1.y));
			label_line.attr({"stroke": color_bg_text,
			                 "opacity": feature_opacity});

			var label = paper.text(xy1.x, xy1.y, _name);
			if (a_c < plasmid_start - 180 && a_c > plasmid_start - 360) { 
				// Left half of wheel: align right
				label.attr({"text-anchor": "end"});
			} else if (a_c < plasmid_start && a_c > plasmid_start - 180) { 
				// Right half of wheel: align left
				label.attr({"text-anchor": "start"});
			} // Top and bottom default to middle, which is correct

			// Update the label heights
			label_heights[section] += label.getBBox().height;

			label.attr({"fill": _color, "font-size":"12pt",
			            "opacity": _opacity});

			_label_set.push(label_line);
			_label_set.push(label);

			// Handlers
			_label_set.click(_click);
			_label_set.hover(_mouse_over, _mouse_up);

			_feature_set.push(_label_set);

			_labeled = true;
			_label_drawn = true;
		} // END Feature::draw_label(r_l)

		this.hide = function () {
			if (_visible) {
				_feature_set.hide();
				_visible = false;
				_labeled = false;
			}
		}; // END Feature::hide()

		this.show = function () {
			if (!_visible) {
				_feature_set.show();
				if (!_labeled)
					_label_set.hide();
				_visible = true;
			}
		}; // END Feature::show()

		this.hide_label = function () {
			if (_labeled) {
				_label_set.hide();
				_labeled = false;
			}
		}; // END Feature::hide()

		this.show_label = function () {
			if (!_labeled) {
				_label_set.show();
				_labeled = true;
			}
		}; // END Feature::show_label()

		this.clear_label = function () {
			if (_label_drawn) {
				_label_set.unclick(_click);
				_label_set.unhover(_mouse_over, _mouse_up);
				_label_set.remove();
				_label_set = paper.set();
				_labeled = false;
				_label_drawn = false;
			}
		}; // END Feature::clear_label()

	}; // END Feature Class

	// Circle setup
	function draw_plasmid() {
		function draw_tic_mark(a) {
			var r0 = tic_mark_radius - tic_mark_length/2;
			var r1 = tic_mark_radius + tic_mark_length/2;
			var xy0 = convert.polar_to_rect(r0,a);
			var xy1 = convert.polar_to_rect(r1,a);
			var tic = paper.path(svg.move(xy0.x, xy0.y) +
								 svg.line(xy1.x, xy1.y));
			tic.attr({"stroke": color_bg_text});

			var xyl = convert.polar_to_rect(tic_label_radius, a);
			var label = paper.text(xyl.x, xyl.y, String(convert.angle_to_pos(a)));
			label.attr({"fill": color_bg_text});
			if (a < plasmid_start || a > 360 - plasmid_start) { // Right half of wheel: align right
				label.attr({"text-anchor": "end"});
			} else if (a > plasmid_start && a < 360 - plasmid_start) { // Left half of wheel: align left
				label.attr({"text-anchor": "start"});
			} // Top and bottom default to middle, which is correct
		}

		var plasmid = paper.circle(cx, cy, plasmid_radius);
		plasmid.attr("stroke", color_plasmid);
		var plasmid_label = paper.text(cx, cy, seq_length + " bp");
		plasmid_label.attr({"fill":      color_plasmid,
							"font-size": "18pt"});

		for (var ang = 0; ang < 360; ang += 30) {
			draw_tic_mark(ang);
		}
	}

	function parse_features_from_json(features_json) {
		var features = [];
        // features_json[0] is sequence length
        var seqlen = features_json[0]
        for (var i=1; i<features_json.length; i++) {
			var row = []
            row[0] = features_json[i]['feature']; // name str
            row[1] = features_json[i]['start'];
            row[2] = features_json[i]['end'];
            row[3] = features_json[i]['type']; // type str
            row[4] = features_json[i]['clockwise'];
			var feat = new Feature(row)
            // loop started at 1
			features[i-1] = feat;
		}
		return [seqlen, features];
	}

	// Calculate cut counts of all Restriction enzyme
	function cut_counts() {
		var cut_counts = {}; 
		// Calculate the counts
		for (fx in features) {
			f = features[fx];
			if (f.type() == ft.enzyme) {
				if (cut_counts[f.name()] === undefined)
					cut_counts[f.name()] = [f];
				else
					cut_counts[f.name()].push(f);
			}
		}
		// Store them for each enzyme feature
		for (fx in features) {
			f = features[fx];
			if (f.type() == ft.enzyme)
				f.set_other_cutters(cut_counts[f.name()]);
		}
	}

	// Move features that overlap to other radii.
	function resolve_conflicts() {
		var conflicts;
		var rad = plasmid_radius; // current radius
		var rx = 1;               // radius counter
		var max_rad = plasmid_radius;

		function push(winner, loser) {
			// Record that the push happened
			winner.pushed_features.push(loser); 
			conflicts++;

			// Do it
			loser.radius = new_rad; 

			if (_debug) console.warn(loser.name() + " pushed by " + winner.name());
			
			// Since loser was pushed, un-push all the 
			// features it caused to be pushed, as long as
			// those features were not in conflict with the winner
			for (var pfx in loser.pushed_features) {
				var pf = loser.pushed_features[pfx];
				// Check for conflict with other the winner feature itself.
				// If there's no conflict, we can pushh it back safely.
				if (pf.start_degrees() - winner.end_degrees() <= min_overlap_cutoff ||
					winner.start_degrees() - pf.end_degrees() <= min_overlap_cutoff) {
					if (_debug)
						console.warn(pf.name() + "unpushed, because " 
							+ loser.name() + " pushed by " + winner.name());
					pf.radius = rad;
				}
			}
		}

		do {
			// Keep alternating between inside and outside the plasmid.
			var new_rad = rad + Math.pow(-1, rx) * rx * radius_spacing;

			conflicts = 0; // Assume you have no conflicts until you find some

			// Clear the record of who pushed whom
			for (var fx in features) {
				features[fx].pushed_features = [];
			}

			var biggest_size = 0;
			var biggest_feature;
			var furthest_point = plasmid_start; // Start at the top of the circle
			for (var fx in features) {
				var f = features[fx];
				if (f.radius == rad && f.type() != ft.enzyme) { 
					var new_size = f.size_degrees();
					var overlap = -(furthest_point - f.start_degrees());
					if (overlap <= min_overlap_cutoff) { 
						// We've cleared all potential conflicts: reset
						// the indicators
						biggest_size = new_size;
						biggest_feature = f;
						furthest_point = f.end_degrees();
					} else if (biggest_size > min_overlap_feature_size &&
						       new_size > min_overlap_feature_size &&
						      (overlap <= 0 || 
						      (overlap/biggest_size > min_overlap_pct &&
						       overlap/new_size > min_overlap_pct))) {
						// Overlap: conflict!
						if (new_size > biggest_size) { // This feature is top dog,
						                               // move the original to the
						                               // new radius
							push(f, biggest_feature);

							// Update the new top dog
							biggest_size = new_size;
							biggest_feature = f;
							furthest_point = f.end_degrees();

						} else { // The original feature is top dog. move the new
						         // feature to the new radius

							push(biggest_feature, f);
						}

					}
				}
			}

			// Keep track of the biggest radius reached
			if (rad > max_rad)
				max_rad = rad;

			// Move on to the next radius
			rad = new_rad;
			rx++;

			
		} while (conflicts > 0); // Keep adding levels of resolution

		return max_rad;
	}

	function draw_features() {
		for (var fx in features) {
			features[fx].draw();
		}
	}

	// Make sure that the appropriate cutters are shown
	function show_hide_cutters() {
		for (var fx in features) {
			var f = features[fx];
			// Only draw enzymes if they are in the list of cutters to show
			if (f.type() == ft.enzyme) {
				if (cutters_to_show.indexOf(f.cut_count()) < 0) {
					f.hide();
					f.clear_label();
				} else {
					f.show();
					f.show_label();
				}
			}
		}
	}

	// Global label height list: keeps track of the current heights of each of
	// the 8 label lists, so that we know at what height to add the next label.
	var label_heights = new Array(16);
	function draw_labels(label_radius) {

		// Global label height list: keeps track of the current heights of each of
		// the 16 label lists, so that we know at what height to add the next label.
		// Reset the list
		label_heights = [0, 0, 0, 0, 0, 0, 0, 0];
	
		// Iterate counterclockwise
		for (var fx = features.length - 1; fx >= 0; fx--) {
			features[fx].draw_label(label_radius);
		}
	}

    //
    // this is what callers should call to draw the plasmid
    //
    function draw(features_json) {
	    paper = ScaleRaphael(map_dom_id, map_width, map_height); // global
	    // These things are only done once
	    var fv = parse_features_from_json(features_json);
        seq_length = fv[0]; // global
        features = fv[1]; // global
	    draw_plasmid();
	    cut_counts(); 

	    // These things may need to be redone
	    var max_radius = resolve_conflicts();
	    var label_radius = max_radius + label_radius_offset; 
	    draw_features(); // Draw all the features initially
	    show_hide_cutters(); // Hide the right cutters
	    draw_labels(label_radius); // Draw only the necessary labels

        if (final_map_width != map_width ||
            final_map_height != map_height) {
            paper.changeSize(final_map_width,final_map_height,true,false)
        }
    }

    return draw
}

