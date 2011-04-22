// Requires: 
//    jquery-ui 1.8.6
//    jquery 1.4.2
//    jquery.ui.tooltip (part of jquery UI 1.9)
//    draw.js
//
// Restriction: can only have one instance of this per DOM
//
// Depends on draw.js for the following (at least):
//    Feature
//    Feature.other_cutters
//    all_features
//    std_features
//    enzyme_features
//    orf_features
//
//
// Call:
//    GiraffeAnalyze(jQuery,gd,{...});
//  or
//    jQuery(document).ready(function($){
//        GiraffeAnalyze($,gd,{...});
//    })
//
// Options:
//    dom_id: dom ID to attach the analyzer window
//    map_width: map width
//    map_height: map height
//    analyzer_width: main width of the entire analyzer
//    linear_map: if 1, switch to linear map to start (default is 0,
//    and uses circular map)
// 

(function(){

function random_dom_id() {
	return 'giraffe-'+Math.floor(Math.random()*100000000);
}

window.GiraffeAnalyze = function ($,gd,options) {
    var dom_id = 'giraffe-analyze';
    if ('dom_id' in options) { dom_id = options['dom_id']; }
    var name = 'Sequence';
    if ('name' in options) { name = options['name']; }
    var map_width = 640;
    if ('map_width' in options) { map_width = options['map_width']; }
    var map_height = 640;
    if ('map_height' in options) { map_height = options['map_height']; }
    var analyzer_width = 1340;
    if ('analyzer_width' in options) { analyzer_width = options['analyzer_width']; }
    var starts_with_linear_map = false;
    if ('linear_map' in options && options['linear_map']) { starts_with_linear_map = true; }

    var viewer_segs_per_line = 5;

    var seqlen = gd.sequence.length;
    var sequence = new BioJS.DNASequence(gd.sequence);
    var cutters = new Cutter_List(gd.enzyme_features);

    function Switch_Panes(panes) {
        var divs = [];
        var links = [];

        function hide_all() {
            for (var i in divs) { $(divs[i]).hide(); } 
            for (var i in links) { $(links[i]).removeClass('giraffe-link-on'); } 
        }
        function show(i) {
            hide_all();
            $(links[i]).addClass('giraffe-link-on');
            $(divs[i]).show();
        }
        function link(i) { return links[i]; }
        function pane(i) { return divs[i]; }

        var links_dom = $('<p></p>');
        var divs_dom = $('<div></div>');

        for (var i in panes) {
            var link_text = panes[i];
            var link_title = undefined;
            if (typeof panes[i] == typeof []) {
                link_text = panes[i][0];
                link_title = panes[i][1];
            }
            divs[i] = $('<div></div>');
            links[i] = $('<a pane="'+i+'" href="#">'+link_text+'</a>').click(function(evt) {
                evt.preventDefault();
                var i = $(this).attr('pane'); show(i);
            });
            if (link_title !== undefined) { links[i].attr('title',link_title); }
            $(links_dom).append(links[i]);
            if (i < panes.length-1) { $(links_dom).append(' | '); }
            $(divs_dom).append(divs[i]);
        }

        return {
            'links' : links_dom,
            'panes' : divs_dom,
            'pane' : pane,
            'link' : link,
            'show' : show,
            'hide_all' : hide_all,
        }
    }

    // Abstraction for handling cutters

    function Cutter_List(enzymes_feature_list) {
        this.enzymes = enzymes_feature_list;
    }

    function __cutter_sorter(a,b) {
        if (a.name() < b.name()) { return -1; }
        if (a.name() > b.name()) { return 1; }
        return 0;
    }

    Cutter_List.prototype.unique=function(){
        if (this.__unique) { return this.__unique; }
        this.__unique = [];
        for (var i in this.enzymes) {
            if (this.enzymes[i].cut_count() == 1) {
                this.__unique.push(this.enzymes[i]);
            }
        }
        this.__unique.sort(__cutter_sorter);
        return this.__unique;
    }

    Cutter_List.prototype.all=function(){
        if (this.__all) { return this.__all; }
        this.__all = [];
        var check = new Array();
        for (var i in this.enzymes) {
            if (this.enzymes[i].name() in check) { }
            else {
                this.__all.push(this.enzymes[i]);
                check[this.enzymes[i].name()] = 1;
            }
        }
        this.__all.sort(__cutter_sorter);
        return this.__all; 
    }

    Cutter_List.prototype.non=function(){
        if (this.__non) { return this.__non; }
        var all_cutters = [
            'AatII', 'Acc65I', 'AccI', 'AclI', 'AfeI', 'AflII',
            'AgeI', 'ApaI', 'ApaLI', 'ApoI', 'AscI', 'AseI',
            'AsiSI', 'AvrII', 'BamHI', 'BclI', 'BglII', 'Bme1580I',
            'BmtI', 'BsaHI', 'BsiEI', 'BsiWI', 'BspEI', 'BspHI',
            'BsrGI', 'BssHII', 'BstBI', 'BstZ17I', 'BtgI', 'ClaI',
            'DraI', 'EaeI', 'EagI', 'EcoRI', 'EcoRV', 'FseI',
            'FspI', 'HaeII', 'HincII', 'HindIII', 'HpaI', 'KasI',
            'KpnI', 'MfeI', 'MluI', 'MscI', 'MspA1I', 'NaeI',
            'NarI', 'NcoI', 'NdeI', 'NgoMIV', 'NheI', 'NotI',
            'NruI', 'NsiI', 'NspI', 'PacI', 'PciI', 'PmeI',
            'PmlI', 'PsiI', 'PspOMI', 'PstI', 'PvuI', 'PvuII',
            'SacI', 'SacII', 'SalI', 'SbfI', 'ScaI', 'SfcI',
            'SfoI', 'SgrAI', 'SmaI', 'SmlI', 'SnaBI', 'SpeI',
            'SphI', 'SspI', 'StuI', 'SwaI', 'XbaI', 'XhoI',
            'XmaI'
        ];
        var all_cutters_hash = new Array();
        for (var i in all_cutters) {
            all_cutters_hash[all_cutters[i]] = 1;
        }
        var have_these = this.all();
        for (var i in have_these) {
            delete all_cutters_hash[have_these[i].name()];
        }
        this.__non = [];
        for (var i in all_cutters_hash) {
            this.__non.push(i);
        }
        return this.__non;
    }

    function sequence_tab(dom) {
        var copy_all = 'To copy sequence: click on sequence, hit ctrl/cmd-A, then ctrl/cmd-C';

        panes = Switch_Panes(['FASTA','GenBank','Reverse Complement']);

        $(dom).append('<p>Current sequence: '+sequence.length()+' base pairs</p>')
              .append(panes.links)
              .append(panes.panes);

        $(panes.pane(0))
            .append('<p>'+copy_all+'</p>')
            .append($('<textarea readonly></textarea>')
                        .addClass('giraffe-seq-textarea')
                        .val(BioJS.fasta(sequence,name,false)));

        var features = [];
        for (var i in gd.all_features) {
            if (gd.all_features[i].is_enzyme()) { continue; }
            var type = "misc_feature";
            var label = gd.all_features[i].name()
            var gene = "";
            if (gd.all_features[i].type() == gd.Feature_Type.origin) {
                type = "rep_origin";
            }
            else if (gd.all_features[i].type() == gd.Feature_Type.gene) {
                type = "gene";
                gene = gd.all_features[i].name();
            }
            else if (gd.all_features[i].is_orf()) {
                type = "CDS";
            }
            else if (gd.all_features[i].type() == gd.Feature_Type.promoter) {
                type = "promoter";
            }
            else if (gd.all_features[i].type() == gd.Feature_Type.terminator) {
                type = "terminator";
            }
            var f = {
                label : label,
                gene : gene,
                type : type,
                start : gd.all_features[i].start(),
                end : gd.all_features[i].end(),
                clockwise : gd.all_features[i].clockwise(),
                clockwise_sequence : gd.all_features[i].clockwise_sequence()
            }
            features.push(f); 
        }

        $(panes.pane(1))
            .append('<p>'+copy_all+'</p>')
            .append($('<textarea readonly></textarea>')
                        .addClass('giraffe-seq-textarea')
                        .val(BioJS.genbank(sequence,name,false,features)));

        $(panes.pane(2))
            .append('<p>'+copy_all+'</p>')
            .append($('<textarea readonly></textarea>')
                        .addClass('giraffe-seq-textarea')
                        .val(BioJS.fasta(sequence.reverse_complement(),name,false)));

        panes.hide_all();
        panes.show(0);
    }

    function map_tab(dom) {
        panes = Switch_Panes(['Circular Map', 'Linear Map']);

		var help, // DOMs
			dom_table_id = random_dom_id(), 
			dom_table, 
			dom_map_id_c = random_dom_id(), 
			dom_map_c,
			dom_control_id_c = random_dom_id(), 
			dom_control_c,
			dom_map_id_l = random_dom_id(), 
			dom_map_l,
			dom_control_id_l = random_dom_id(), 
			dom_control_l,
			gt, gd_c, gd_l, gc_c, gc_l; // GriaffeDraw/Table/Controls

        help =
            $('<p id="giraffe-map-help" '+
              ' class="giraffe-help giraffe-hide '+
                      'ui-widget ui-corner-all ui-widget-content">'+
              'Click on a feature label or feature to highlight DNA sequence.'+
              '</p>');

		// Table dom
		dom_table = $('<div id="'+dom_table_id+'"></div>');

        $(dom)
            .append(help)
            .append(panes.links)
            .append(panes.panes)
			.append(dom_table);

		gt = GiraffeTable($, gd, dom_table);

		// Circular map pane
        dom_map_c = $('<div id="'+dom_map_id_c+'" class="giraffe-analyze-map giraffe-analyze-circular-map"></div>');
		dom_control_c = $('<div id="' + dom_control_id_c + '" class="giraffe-analyze-map-control"></div>');
        $(panes.pane(0))
            .append(dom_map_c)
            .append(dom_control_c);

        gd_c = gd.CircularMap({
            'map_dom_id' : dom_map_id_c,
            'plasmid_name' : name,
            'cutters': [1],
            'map_width' : map_width,
            'map_height' : map_height,
            'feature_click_callback' : map_feature_click_callback
        });
		gc_c = GiraffeControl($, gd_c, dom_control_c);

		// Linear map pane
        dom_map_l = $('<div id="'+dom_map_id_l+'" class="giraffe-analyze-map giraffe-analyze-linear-map"></div>');
		dom_control_l = $('<div id="' + dom_control_id_c + '" class="giraffe-analyze-map-control"></div>');
        $(panes.pane(1))
            .append(dom_map_l)
            .append(dom_control_l);

        gd_l = gd.LinearMap({
            'map_dom_id' : dom_map_id_l,
            'plasmid_name' : name,
            'cutters': [1],
            'map_width' : map_width,
            'map_height' : map_height,
            'feature_click_callback' : map_feature_click_callback
        });
		gc_l = GiraffeControl($, gd_l, dom_control_l);

        panes.hide_all();
        if (starts_with_linear_map) { panes.show(1); }
        else { panes.show(0); }

        $('svg path, svg text').mouseover(function(){ $(help).show(); });
        $('svg path, svg text').mouseout(function(){ $(help).hide(); });
    }


	function digest_map_panes(dom) {

		var cpanes,
			dom_map_c,
			dom_map_id_c = random_dom_id(),
			dom_control_c,
			dom_map_l,
			dom_map_id_l = random_dom_id(),
			dom_control_l,
			circular_digest_map_shrink_factor = 0.7;

		// Cutter map above
		cpanes = Switch_Panes(['Linear Digest', 'Circular Digest']);

		$(dom)
			.append(cpanes.panes);

		// Linear digest pane
        dom_map_l = $('<div id="'+ dom_map_id_l+'" class="giraffe-analyze-map giraffe-analyze-linear-map giraffe-digest-map"></div>');
		dom_control_l = $('<div id="' + random_dom_id()  + '" class="giraffe-analyze-map-control giraffe-digest-control"></div>');
        $(cpanes.pane(0))
            .append(dom_map_l)
            .append(dom_control_l);

        gd_l = gd.LinearMap({
            'map_dom_id' : dom_map_id_l,
            'plasmid_name' : name,
			'digest' : true,
            'cutters': [1],
            'map_width' : map_width,
            'map_height' : map_height,
            'feature_click_callback' : map_feature_click_callback
        });
		gc_l = GiraffeControl($, gd_l, dom_control_l);

		// Circular digest pane
        dom_map_c = $('<div id="'+ dom_map_id_c+'" class="giraffe-analyze-map giraffe-analyze-circular-map giraffe-digest-map"></div>');
		dom_control_c = $('<div id="' + random_dom_id()  + '" class="giraffe-analyze-map-control giraffe-digest-control"></div>');
        $(cpanes.pane(1))
            .append(dom_map_c)
            .append(dom_control_c);

        gd_c = gd.CircularMap({
            'map_dom_id' : dom_map_id_c,
            'plasmid_name' : name,
			'digest' : true,
            'cutters': [1],
            'map_width' : map_width * circular_digest_map_shrink_factor,
            'map_height' : map_height * circular_digest_map_shrink_factor,
            'feature_click_callback' : map_feature_click_callback
        });
		gc_c = GiraffeControl($, gd_c, dom_control_c);


		// Control of the digest panes by the restriction enzyme checkboxes on the
		// map


		// Show the linear map by default
        cpanes.hide_all();
        cpanes.show(0);

		return cpanes;
	}

    function digest_tab(dom) {

		// Labels at the top
		var label_panes = Switch_Panes(
            [['Cutters','See restriction enzymes that cut the sequence'],
             ['Linear Digest','See restriction digest bands assuming a linear sequence'],
             ['Circular Digest','See restriction digest bands assuming a circular sequence']
            ]
        );

        $(dom)
            .append(label_panes.links);
		label_panes.show(0);

   		// Digest data below
        var digest_panes = Switch_Panes(
            ['All Cutters', 'Unique Cutters', 'Non-Cutters',
             'Linear Digest', 'Circular Digest']
        );

   		// Digest maps above: need to pass in digest panes so that
		// the map controls can pick the corresponding digest pane
		var map_panes = digest_map_panes(dom, digest_panes);


        $(dom)
            .append(digest_panes.panes);

		var all = cutters.all();
        var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
        for (var i in all) {
            var name = $('<label></label>').append(all[i].name());
            var cuts = [];
            var all_of_this = all[i].other_cutters();
            for (var c in all_of_this) {
                cuts.push(gd.all_features[all_of_this[c]].cut());
            }
            for (var c in cuts) {
                cuts[c] = '<a href="#" seq-title="'+all[i].name()
                          +' cut site" bp="'+cuts[c]+'" class="giraffe-bp">'+cuts[c]+'</a>';
            }
            var s = $('<p>Cuts after '+cuts.join(', ')+'</p>');
            var item = $('<li></li>').append(name).append(s);
            $(list).append(item);
        }
        $(digest_panes.pane(0)).append(list);

        var unique = cutters.unique();
        var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
        for (var i in unique) {
            var name = $('<label></label>').append(unique[i].name());
            var x = '<a href="#" seq-title="'+unique[i].name()
                    +' cut site" bp="'+unique[i].cut()+'" class="giraffe-bp">'
                    +unique[i].cut()+'</a>';
            var s = $('<p>Cuts after '+x+'</p>');
            var item = $('<li></li>').append(name).append(s);
            $(list).append(item);
        }
        $(digest_panes.pane(1)).append(list);

        var non = cutters.non();
        var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
        for (var i in non) {
            var name = $('<label></label>').append(non[i]);
            var item = $('<li></li>').append(name);
            $(list).append(item);
        }
        $(digest_panes.pane(2))
            .append('<p>The following cutters do not cut this sequence.</p>')
            .append(list);

        function __digest(circular) {
            var all = cutters.all();
            var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
            for (var i in all) {
                var name = $('<label></label>').append(all[i].name());
                var cuts = [];
                var all_of_this = all[i].other_cutters();
                all_of_this.sort(function(a,b){
                    return gd.all_features[a].start() -
                        gd.all_features[b].start();
                });
                for (var c in all_of_this) {
                    cuts.push(gd.all_features[all_of_this[c]].cut());
                }
                var digests = []
                for (var j=0; j<cuts.length; j++) {
                    if (j == 0 && !circular) {
                        var a0 = '<a href="#" class="giraffe-bp" '
                                 +'seq-title="Fragment cut by '
                                 +all[i].name()+'" bp="1,'+cuts[j]+'">';
                        digests.push(a0+'1-'+(cuts[j])+'</a> ('+cuts[j]+' bp)');
                    }
                    if (j+1 == cuts.length) {
                        if (circular) {
                            var a0 = '<a href="#" class="giraffe-bp" '
                                     +'seq-title="Fragment cut by '
                                     +all[i].name()+'" bp="'
                                     +(cuts[j]+1)+','+cuts[0]+'">';
                            digests.push(a0+(cuts[j]+1)+'-'+cuts[0]+'</a> ('+
                                         (seqlen-(cuts[j]+1)+1+cuts[0])+' bp)');
                        }
                        else {
                            var a0 = '<a href="#" class="giraffe-bp" '
                                     +'seq-title="Fragment cut by '
                                     +all[i].name()+'" bp="'
                                     +(cuts[j]+1)+','+seqlen+'">';
                            digests.push(a0+(cuts[j]+1)+'-'+seqlen+'</a> ('+
                                         (seqlen-(cuts[j]+1)+1)+' bp)');
                        }
                    }
                    else {
                        var a0 = '<a href="#" class="giraffe-bp" '
                                 +'seq-title="Fragment cut by '
                                 +all[i].name()+'" bp="'
                                 +(cuts[j]+1)+','+cuts[j+1]+'">';
                        digests.push(a0+(cuts[j]+1)+'-'+(cuts[j+1])+'</a> ('+
                                     (cuts[j+1]-(cuts[j]+1)+1)+' bp)');
                    }
                }
                var s = $('<p>'+digests.join(', ')+'</p>');
                var item = $('<li></li>').append(name).append(s);
                $(list).append(item);
            }
            return list;
        }

        $(digest_panes.pane(3)).append(__digest(false));
        $(digest_panes.pane(4)).append(__digest(true));

		// Digest map control by the pane links
		
		// show a linear digest for the all- and unique-cutters panes
		// and for the linear digest pane
		$(label_panes.link(0)).click(function () {
			map_panes.show(0);
		});

		$(label_panes.link(1)).click(function () {
			map_panes.show(0);
			digest_panes.show(3);
		});

		// Circular digest pane shows a circular map
		$(label_panes.link(2)).click(function () {
			map_panes.show(1);
			digest_panes.show(4);
		});


		// By default, show the uniqe-cutter pane
		digest_panes.show(1);
    }

    function translate_tab(dom) {
        panes = Switch_Panes(
            ['ORFs',
             "5'3' Frame 1",
             "5'3' Frame 2",
             "5'3' Frame 3",
             "3'5' Frame 1",
             "3'5' Frame 2",
             "3'5' Frame 3"]
        );

        $(dom)
            .append(panes.links)
            .append(panes.panes);

        $(panes.pane(0))
            .append('<p>Click on ORF bp numbers to highlight sequence.</p>');

        var starts_with = 1;
        for (var i in gd.orf_features) {
            var f = gd.orf_features[i];

            // does this ORF cover, or is the same as, a gene?
            var gene_desc = '';
            for (var j in gd.all_features) {
                if (gd.all_features[j].type() == gd.Feature_Type.gene &&
                    gd.all_features[j].clockwise() == f.clockwise()) {
                    var g = gd.all_features[j];
                    var f_end = f.end();
                    if (f.end() < f.start()) { f_end = f_end+seqlen; }
                    var g_end = g.end();
                    if (g.end() < g.start()) { g_end = g_end+seqlen; }
                    if (g.start() >= f.start() && g_end <= f_end) {
                        gene_desc = 'contains '+g.name();
                    }
                    else if (g.start() < f.start() && g_end > f_end) {
                        gene_desc = 'within '+g.name();
                    }
                    else if ((g.start() < f.start() && g_end > f.start()) ||
                             (g.start() < f_end && g_end > f_end)) {
                        gene_desc = 'overlaps with '+g.name();
                    }
                }
            }

            starts_with = 0;
            var s = f.clockwise_sequence();

            var p;
            var seq_start, seq_end;
            if (f.clockwise()) {
                s = new BioJS.DNASequence(s);
                p = s.translate();
                seq_start = f.start();
                seq_end = f.end();
            }
            else {
                s = new BioJS.DNASequence(s).reverse_complement();
                p = s.translate();
                seq_start = f.end();
                seq_end = f.start();
            }
        
            var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
            $(overlay_switch.pane(0)).append(p.format_html_with_bp());
            $(overlay_switch.pane(1)).append(s.format_html_with_aa(seq_start,seq_end));
            overlay_switch.show(0);

            var title = 'ORF';
            if (gene_desc !== '') { title += ', '+gene_desc; }
            var t = 'ORF <a href="#" class="giraffe-bp" '
                     +'seq-title="'+title+'" bp="'
                     +f.start()+','+f.end()+'">';
            if (f.clockwise()) { t += f.start()+' - '+f.end(); }
            else { t += f.end()+' - '+f.start()+' antisense'; }
            t += '</a> ('+s.length()/3+' aa)';
            if (gene_desc !== '') { t += ', '+gene_desc; }
            
            var title = $('<p></p>').append(t);
            $(title).append(overlay_switch.links);

            $(panes.pane(0))
                .append($('<div></div>').addClass('giraffe-orf-group')
                            .append(title)
                            .append($('<div></div>').addClass('giraffe-seq')
                                                    .addClass('giraffe-left')
                                                    .addClass('giraffe-protein')
                                                    .append(overlay_switch.panes)
                            )
                            .append(
                                $('<div></div>')
                                    .append($(BioJS.NCBI_blastp_form(p)))
                                    .addClass('giraffe-ncbi-button')
                                    .addClass('giraffe-left')
                                    .addClass('giraffe-left-last')
                            )
                            .append($('<div>&nbsp;</div>').addClass('giraffe-clear'))
                       );
        }

        var p = sequence.translate();
        var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
        $(overlay_switch.pane(0)).append(p.format_html_with_bp());
        $(overlay_switch.pane(1)).append(sequence.format_html_with_aa());
        overlay_switch.show(0);

        $(panes.pane(1)).append(overlay_switch.links).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(overlay_switch.panes)
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var s = sequence.substring(1);
        var p = s.translate();
        var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
        $(overlay_switch.pane(0)).append(p.format_html_with_bp());
        $(overlay_switch.pane(1)).append(s.format_html_with_aa(2));
        overlay_switch.show(0);

        $(panes.pane(2)).append(overlay_switch.links).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(overlay_switch.panes)
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var s = sequence.substring(2);
        var p = s.translate();
        var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
        $(overlay_switch.pane(0)).append(p.format_html_with_bp());
        $(overlay_switch.pane(1)).append(s.format_html_with_aa(3));
        overlay_switch.show(0);

        $(panes.pane(3)).append(overlay_switch.links).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(overlay_switch.panes)
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var s = sequence.reverse_complement();
        var p = s.translate();
        var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
        $(overlay_switch.pane(0)).append(p.format_html_with_bp());
        $(overlay_switch.pane(1)).append(s.format_html_with_aa(sequence.length(),1));
        overlay_switch.show(0);

        $(panes.pane(4)).append(overlay_switch.links).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(overlay_switch.panes)
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );
        
        var s = sequence.reverse_complement().substring(1);
        var p = s.translate();
        var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
        $(overlay_switch.pane(0)).append(p.format_html_with_bp());
        $(overlay_switch.pane(1)).append(s.format_html_with_aa(sequence.length()-1,1));
        overlay_switch.show(0);

        $(panes.pane(5)).append(overlay_switch.links).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(overlay_switch.panes)
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var s = sequence.reverse_complement().substring(2);
        var p = s.translate();
        var overlay_switch = Switch_Panes(['AA only', 'With DNA']);
        $(overlay_switch.pane(0)).append(p.format_html_with_bp());
        $(overlay_switch.pane(1)).append(s.format_html_with_aa(sequence.length()-2,1));
        overlay_switch.show(0);

        $(panes.pane(6)).append(overlay_switch.links).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(overlay_switch.panes)
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        panes.hide_all();
        panes.show(starts_with);
    }

    function blast_tab(dom) {
        $(dom).append('<p><b>BLAST</b></p>'+
            '<p>BLAST finds regions of similarity between biological sequences. Click on the buttons below to BLAST your sequence. Results will appear in a new window.</p>');
        var blastn = $(BioJS.NCBI_blastn_form(sequence));
        var blastx = $(BioJS.NCBI_blastx_form(sequence));
        $(dom).append('<p>Search for matching nucleotide sequence with BLASTN:</p>')
            .append(blastn);
        $(dom).append('<p>Search for matching protein sequence with BLASTX:</p>')
            .append(blastx);
        var recent = $(BioJS.NCBI_recent_results_link());
        $(recent).append('See recent BLAST results on NCBI website.');
        $(dom).append($('<p></p>').append(recent));
    }

    function align_tab(dom) {
        $(dom).append('<p><b>Align Sequence with BLAST2</b></p>'+
            "<p>NCBI's BLAST2 program aligns two sequences. Enter a new sequence to align against your sequence. Results will appear in a new window.</p>");
        var blast2 = $(BioJS.NCBI_blast2_form(sequence)).addClass('giraffe-blast2');
        $(dom).append(blast2);
        var recent = $(BioJS.NCBI_recent_results_link());
        $(recent).append('See recent BLAST results on NCBI website.');
        $(dom).append($('<p></p>').append(recent));
    }

    // Set of tabs for analyzing the sequence, but does not include
    // the sequence viewer.
    function analyzer_tabs(dom) {
        // Create each tab
        var dom_id_sequence = random_dom_id();
        var dom_tab_sequence = $('<div id="'+dom_id_sequence+'"></div>')
            .addClass('giraffe-tab');
        var dom_id_map = random_dom_id();
        var dom_tab_map = $('<div id="'+dom_id_map+'"></div>')
            .addClass('giraffe-tab');
        var dom_id_blast = random_dom_id();
        var dom_tab_blast = $('<div id="'+dom_id_blast+'"></div>')
            .addClass('giraffe-tab');
        var dom_id_align = random_dom_id();
        var dom_tab_align = $('<div id="'+dom_id_align+'"></div>')
            .addClass('giraffe-tab');
        var dom_id_digest = random_dom_id();
        var dom_tab_digest = $('<div id="'+dom_id_digest+'"></div>')
            .addClass('giraffe-tab');
        var dom_id_translate = random_dom_id();
        var dom_tab_translate = $('<div id="'+dom_id_translate+'"></div>')
            .addClass('giraffe-tab');
        // Main tab bar
        var dom_tabs = $('<div></div>').append(
            '<ul>'+
            '<li><a href="#'+dom_id_map+'">Map and Features</a></li>'+
            '<li><a href="#'+dom_id_sequence+'">Sequence</a></li>'+
            '<li><a href="#'+dom_id_blast+'">Blast</a></li>'+
            '<li><a href="#'+dom_id_align+'">Align</a></li>'+
            '<li><a href="#'+dom_id_digest+'">Digest</a></li>'+
            '<li><a href="#'+dom_id_translate+'">Translate</a></li>'+
            '</ul>'
        ).append(dom_tab_map)
         .append(dom_tab_sequence)
         .append(dom_tab_blast)
         .append(dom_tab_align)
         .append(dom_tab_digest)
         .append(dom_tab_translate)
         .append($('<div></div>').addClass('giraffe-clear'))
         .addClass('giraffe-tabs');

        $(dom).append(dom_tabs);
        $(dom_tabs).tabs();

        map_tab(dom_tab_map);
        sequence_tab(dom_tab_sequence);
        digest_tab(dom_tab_digest);
        translate_tab(dom_tab_translate);
        blast_tab(dom_tab_blast);
        align_tab(dom_tab_align);
    }

    // Sequence viewer

    var sequence_viewer_topbar_highlight;
    var sequence_viewer_topbar_mouseover;
    var search_rc = false;
    var search_next = -1;

    function sequence_viewer(dom) {
        var viewer = $('<div></div>').addClass('giraffe-viewer');

        var sequence_viewer_search = $('<div></div>')
            .attr('id', 'giraffe-viewer-search-container')
            .append($('<textarea></textarea>')
                        .attr('id', 'giraffe-viewer-search-textarea'))
            .append($('<input type="submit" value="Search" '+
                      ' title="Search sequence and reverse complement of sequence">')
                        .attr('id', 'giraffe-viewer-search-button'));

        sequence_viewer_topbar_highlight = $('<div></div>')
            .attr('id', 'giraffe-viewer-topbar-highlight');
        sequence_viewer_topbar_mouseover = $('<div></div>')
            .attr('id', 'giraffe-viewer-topbar-mouseover');

        var topbar = $('<div></div>').addClass('giraffe-viewer-topbar')
            .append(sequence_viewer_search)
            .append(sequence_viewer_topbar_mouseover)
            .append(sequence_viewer_topbar_highlight)
            .append('&nbsp;');

        // Sequence viewer is basically a table, each cell has 10 bps.
        var seq_viewer = $('<div></div>').addClass('giraffe-seq-viewer');
        var table = $('<table></table>');
        $(seq_viewer).append(table);

        var row;
        var lines_10 = BioJS.wrap(sequence.sequence(),10);
        for (var i=0,j=0; i<lines_10.length; i++) {
            if (j == 0) {
                row = $('<tr></tr>');
                $(table).append(row);
                var start = i*10+1;
                $(row).append
                    ('<td class="giraffe-bp-marker giraffe-bp-marker-left">'+start+'</td>');
            }
            var start = i*10+1;
            var end = (i+1)*10;
            var td = $('<td></td>')
                .attr('id','giraffe-bp-'+start)
                .attr('start',start)
                .attr('end',end)
                .mouseenter(function(){
                    $(this).addClass('giraffe-seq-mouseover');
                    var title = $(this).attr('start')+'-'+$(this).attr('end');
                    $(sequence_viewer_topbar_mouseover).html(title);
                 })
                .mouseleave(function(){
                    $(this).removeClass('giraffe-seq-mouseover');
                    $(sequence_viewer_topbar_mouseover).html("");
                 })
                .append(lines_10[i]);
            $(row).append(td);
            j++;
            if (j == viewer_segs_per_line && i+1 < lines_10.length) {
                j = 0;
                var end = (i+1)*10;
                $(row).append
                    ('<td class="giraffe-bp-marker giraffe-bp-marker-right">'+end+'</td>');
            }
            if (i+1 == lines_10.length) {
                $(row).append
                    ('<td class="giraffe-bp-marker giraffe-bp-marker-right">'
                     +sequence.length()+'</td>');
            }
        }

        // messages for search, normally hidden
        var search_not_found = $('<div></div>')
            .attr('id','giraffe-viewer-search-not-found')
            .append('Search: cannot find sequence')
            .attr('title', 'Sequence Search')
            .hide();

        $(viewer)
            .append(topbar)
            .append(seq_viewer)
            .append(search_not_found);

        $(dom).append(viewer);

        // for searching:
        var rc = sequence.reverse_complement();

        $('#giraffe-viewer-search-textarea').change(function(){
            search_next = -1;
            search_rc = false;
        });
        $('#giraffe-viewer-search-button').click(function(){
            var q = $('#giraffe-viewer-search-textarea').val();
            q = q.replace(/\s/g,'');
            $('#giraffe-viewer-search-textarea').val(q);
            var n;
            if (!search_rc) {
                n = sequence.find(q,search_next);
                if (n == -1) {
                    search_next = -1;
                    search_rc = true;
                    n = rc.find(q,search_next);
                }
            }
            else { n = rc.find(q,search_next); }

            if (n == -1) {
                $(search_not_found).dialog({
                    modal: true,
                    buttons: { 'Close' : function() { $(this).dialog( "close" ); } }
                });
                search_next = -1;
                search_rc = true;
            }
            else {
                search_next = n+q.length;
                sequence_viewer_clear_highlight();
                var bp;
                if (search_rc) {
                    bp = [sequence.length()-(n+q.length-1)+1,sequence.length()-n+1];
                    sequence_viewer_bp_event_highlight(bp,'Reverse complement of query');
                }
                else {
                    bp = [n,n+q.length-1];
                    sequence_viewer_bp_event_highlight(bp,'Query');
                }
            }
        });
    }

    // global list of td's that have span in the middle
    var global_has_span_td = [];

    function sequence_viewer_clear_highlight() {
        $(sequence_viewer_topbar_highlight).html("");
        $('.giraffe-seq-highlight').removeClass('giraffe-seq-highlight');
        $('.giraffe-bp-click-source').removeClass('giraffe-bp-click-source');
        for (var i in global_has_span_td) {
            var t = $(global_has_span_td[i]).text();
            t = t.replace(/\s/g,'');
            $(global_has_span_td[i]).html(t);
        }
        global_has_span_td = [];
    }

    function sequence_viewer_bp_event() {
        $('.giraffe-bp').click(function(evt){
            sequence_viewer_clear_highlight();
            $(this).addClass('giraffe-bp-click-source');
            evt.preventDefault();

            var bpstr = $(this).attr('bp');
            var title = $(this).attr('seq-title');
            var bp = bpstr.split(',');
            if (bp.length > 0) { sequence_viewer_bp_event_highlight(bp,title); }
        });
    }

    function sequence_viewer_bp_event_highlight(bp,title) {
        for (var i in bp) { bp[i] = parseInt(bp[i]); }
        // find start bp position for the first td
        var first_td = Math.floor((bp[0]-1)/10)*10+1;
        // find start bp position of the last td
        var last_td = first_td;
        if (bp.length > 1) {
            last_td = Math.floor((bp[1]-1)/10)*10+1;
        }
        else { bp[1] = bp[0]; }
        
        var desc = bp[0];
        if (bp[0] != bp[1]) { desc += '-'+bp[1]; }
        desc += ': '+title;
        $(sequence_viewer_topbar_highlight).html(desc);

        // draw first
        var first_td_dom = $('#giraffe-bp-'+first_td);
        var t = $(first_td_dom).text();
        t = t.replace(/\s/g,'');
        
        if (first_td == last_td && bp[0]>bp[1]) {
            // yikes... difficult, need to draw two spans
            var span0_starts_at = 0;
            var span0_ends_before = bp[1]+1-first_td;
            var span1_starts_at = bp[0]-first_td;
            var span1_ends_before = 10;
            var new_t = '';
            for (var i=0; i<t.length; i++) {
                if (i == span0_starts_at || i == span1_starts_at) {
                    new_t += '<span class="giraffe-seq-highlight">';
                }
                new_t += t[i];
                if (i == span0_ends_before-1 || i == span1_ends_before-1) {
                    new_t += '</span>';
                }
            }
            $(first_td_dom).html(new_t);
            global_has_span_td.push(first_td_dom);
        }
        else {
            var span_starts_at = bp[0]-first_td;
            var span_ends_before = 10;
            if (last_td == first_td && bp[0] <= bp[1]) {
                span_ends_before = bp[1]+1-first_td;
            }
            var new_t = '';
            for (var i=0; i<t.length; i++) {
                if (i == span_starts_at) {
                    new_t += '<span class="giraffe-seq-highlight">';
                }
                new_t += t[i];
                if (i == span_ends_before-1) {
                    new_t += '</span>';
                }
            }
            $(first_td_dom).html(new_t);
            global_has_span_td.push(first_td_dom);
        }

        // draw everything in between
        if (first_td <= last_td && bp[0] <= bp[1]) {
            for (var td=first_td+10; td<last_td; td+=10) {
                $('#giraffe-bp-'+td).addClass('giraffe-seq-highlight');
            }
        }
        else {
            var end_td = Math.floor((seqlen-1)/10)*10+1;
            for (var td=first_td+10; td<=end_td; td+= 10) {
                $('#giraffe-bp-'+td).addClass('giraffe-seq-highlight');
            }
            for (var td=1; td<last_td; td+=10) {
                $('#giraffe-bp-'+td).addClass('giraffe-seq-highlight');
            }
        }

        // draw last
        if (first_td != last_td) {
            if (bp[1] == last_td+10-1) {
                $('#giraffe-bp-'+last_td).addClass('giraffe-seq-highlight');
            }
            else {
                var last_td_dom = $('#giraffe-bp-'+last_td);
                var t = $(last_td_dom).text();
                t = t.replace(/\s/g,'');
                var span_starts_at = 0;
                var span_ends_before = bp[1]-last_td+1;
                var new_t = '';
                for (var i=0; i<t.length; i++) {
                    if (i == span_starts_at) {
                        new_t += '<span class="giraffe-seq-highlight">';
                    }
                    new_t += t[i];
                    if (i == span_ends_before-1) {
                        new_t += '</span>';
                    }
                }
                $(last_td_dom).html(new_t);
                global_has_span_td.push(last_td_dom);
            }
        }

        // for best visual, we want to scroll to the first td

        var first_td_line = Math.floor(first_td/(viewer_segs_per_line*10));
        // we want the line to scroll to to not be the first line on
        // screen, but a few lines down
        if (first_td_line > 3) { first_td_line -= 3; }
        var total_lines = Math.floor(seqlen/(viewer_segs_per_line*10))+1;
        var table = $('.giraffe-seq-viewer table');
        var scroll = Math.floor((first_td_line/total_lines)*$(table).height());
        $('.giraffe-seq-viewer').scrollTop(scroll);
    }

    function map_feature_click_callback(feature) {
        sequence_viewer_clear_highlight();
        var bp = [feature.start(),feature.end()];
        sequence_viewer_bp_event_highlight(bp,feature.name());
    }

    function full_widget() {
        var dom_table = $('<table></table>');
        var dom_row = $('<tr></tr>');
        $(dom_table).append(dom_row);

        var dom_id_viewer = random_dom_id();
        var dom_id_tabs = random_dom_id();

        var dom_viewer = $('<td id="'+dom_id_viewer+'"></td>');
        var dom_tabs = $('<td id="'+dom_id_tabs+'"></td>');

        $(dom_row)
            .append(dom_viewer)
            .append(dom_tabs)
            .append($('<div></div>').addClass('giraffe-clear'));

        var dom_main = $('#'+dom_id);
        $(dom_main).addClass('giraffe-main')
            .append(dom_table);

        sequence_viewer(dom_viewer);
        analyzer_tabs(dom_tabs);
        sequence_viewer_bp_event(dom_viewer);

        $(dom_main).width(analyzer_width);
        var viewer_width = 2*analyzer_width/5;
        var tabs_width = analyzer_width-viewer_width;
        $(dom_viewer).width(viewer_width);
        $(dom_tabs).width(tabs_width);
    
        $(dom_main).tooltip();
    }

    full_widget();

}

// Private utility function with no external or closure use
function title_case(str) {
	str = str.replace(/\W/, ' ');
	return str[0].toUpperCase() + str.slice(1);
}

// Private utility function with no external or closure use
function type_code_to_name(code, gd) {
	for (var type in gd.Feature_Type) {
		if (code == gd.Feature_Type[type]) {
			return title_case(type);
		}
	}

	return "";
}

window.GiraffeTable = function ($,gd,dom) {	
 	var enzyme_table,
	    feature_table,
		orf_table;

	// Read the features in for each table, only displaying the table
	// if there are features for it

	// Standard features
	if (gd.std_features.length > 0) {
		
		// Initialize table
		feature_table = $('<table></table>')
			.append('<thead><tr><th>Feature</th><th>Type</th><th>Start</th><th>End<th></tr></thead>')
			.append('<tbody></tbody>')
			.addClass('giraffe-table-feature');

		for (var fx = 0; fx < gd.std_features.length; fx++) {
			var f = gd.std_features[fx],
				row = feature_table.children('tbody')
				                   .append('<tr></tr>')
								   .children().last()
								   .attr('id', 'feature-' + f.id());

			row.append('<td>' + f.name() + '</td>');
			row.append('<td>' + type_code_to_name(f.type(), gd) + '</td>');

			if (f.clockwise()) {
				row.append('<td>' + f.start() + '</td>');
				row.append('<td>' + f.end() + '</td>');
			} else {
				row.append('<td>' + f.end() + '</td>');
				row.append('<td>' + f.start() + '</td>');
			}
		}

		$(dom).append(feature_table);
	}

	// ORFs
	if (gd.orf_features.length > 0) {

		// Initialize table
		orf_table = $('<table></table>')
			.append('<thead><tr><th>ORF Frame</th><th>Start</th><th>End<th></tr></thead>')
			.append('<tbody></tbody>')
			.addClass('giraffe-table-orf');

		for (var fx = 0; fx < gd.orf_features.length; fx++) {

			var f = gd.orf_features[fx],
				row = orf_table.children('tbody').append('<tr></tr>').children().last();

			row.append('<td>' + f.name().replace(/ORF\s+[fF]rame\s+/, '') + '</td>');

			if (f.clockwise()) {
				row.append('<td>' + f.start() + '</td>');
				row.append('<td>' + f.end() + '</td>');
			} else {
				row.append('<td>' + f.end() + '</td>');
				row.append('<td>' + f.start() + '</td>');
			}
		}

		$(dom).append(orf_table);
	}

	// Enzymes
	if (gd.enzyme_features.length > 0) {

		enzyme_table = $('<table></table>')
			.append('<thead><tr><th>Enzyme</th><th>Cut</th></tr></thead>')
			.append('<tbody></tbody>')
			.addClass('giraffe-table-enzyme');

		for (var fx = 0; fx < gd.enzyme_features.length; fx++) {
			var f = gd.enzyme_features[fx],
				row;

			if (f.default_show_feature() && f.cut_count() == 1) {
				row = enzyme_table.children('tbody').append('<tr></tr>').children().last();
				row.append('<td>' + f.name() + '</td>');
				row.append('<td>' + f.cut() + '</td>');
			}
		}

		$(dom).append(enzyme_table);
	}

	// Set general appearance properties
	$(dom).children().addClass('giraffe-table');
	
	return $(dom);
};

window.GiraffeControl = function ($,gd_map,dom) {	
 	var controls,
		table,
		_debug = false,
		draw_table,
		draw_feature_controls,
		control_feat_types,
		feat_control_table,
		ftx, ft;

	draw_table = true;
	draw_enzyme_controls = true;
	draw_feature_controls = true;
	//XXX For now, we keep this hidden. Maybe we'll do something with it later.
	draw_extra_features_checkbox = false;
	
	if (gd_map.is_digest()) {
		draw_table = false;
		draw_feature_controls = false;
	}

	controls = $('<form action="" class="giraffe-controls">\
		<fieldset><legend>Feature Options</legend><table><tbody><tr class="controls-row"></tr></tbody></table>\
		</fieldset></form>');

	if (draw_enzyme_controls) {
		controls.find('tr').append(
			'<td class="enzymes"><table>\
			<thead><tr><th>Restriction Enzymes</th></tr></thead>\
			<tbody>\
				<tr><td><label><input type="checkbox" checked="checked"\
					          name="cutters-1" value="show" />\
				1-cutters</label></td></tr>\
				<tr><td><label><input type="checkbox"\
					          name="cutters-2" value="show" />\
				2-cutters</label></td></tr>\
				<tr><td><label><input type="checkbox"\
					          name="cutters-3" value="show" />\
				3-cutters</label></td></tr>\
			</tbody>\
			</table></td>')

		// Changes to the Restriction Enzyme selection
		controls.find('input[name|="cutters"]').change(function (event) {
			var opts = [];

			// Parse out selected options
			$(this).closest('tbody').find("input[checked]").each(function () {
				opts.push(parseInt($(this).attr('name').match(/\d+/)));
			});

			gd_map.redraw_cutters(opts);
		});
	}
	
	if (draw_feature_controls) {
		//                     Control name        feature type
		control_feat_types = [["Generic features", "feature"],
							  ["Genes",            "gene"],
							  ["Regulatory",       "regulatory"],
							  ["Promoters",        "promoter"],
							  ["Primers",          "primer"],
							  ["Terminators",      "terminator"],
							  ["Origins",          "origin"],
							  ["ORFs",             "orf"]];

		feat_control_table = controls.find('tr.controls-row')
			.append('<td class="features">\
				<table><thead><tr><th>Show</th><th>Label</th><th>Feature Type</th></tr>\
				</thead><tbody></tbody></table>')
			.find('td.features tbody');

		for (ftx = 0; ftx < control_feat_types.length; ftx++) {
			feat_control_table.append(
			'<tr class="' + control_feat_types[ftx][1] + '">\
				<td><input type="checkbox" checked="checked"\
					   name="all-' + control_feat_types[ftx][1] + '" value="show" />\
				</td>\
				<td><input type="checkbox" checked="checked"\
					   name="all-' + control_feat_types[ftx][1] + '" value="label" />\
				</td>\
				<td>' +  control_feat_types[ftx][0] + '</td></tr>');
		}

		controls.children('fieldset')
			.append('<label><input type="checkbox" name="extra-features" value="show" />\
					Show extra features</label>');

		// Changes to the feature types
		controls.find('td.features input[value="show"]').click(function (event) {
			var feat_type_name,
				label_checkbox;

			feat_type_name = $(this).attr("name").replace(/all-/, '');
			label_checkbox = $(this).parent().siblings().children().first();

			if ($(this).attr("checked")) {
				gd_map.show_feature_type(feat_type_name);
				label_checkbox.removeAttr("disabled");
				label_checkbox.attr("checked", "checked");
			} else {
				gd_map.hide_feature_type(feat_type_name);
				label_checkbox.attr("disabled", "disabled");
			}
		});

		controls.find('td.features input[value="label"]').click(function (event) {
			var feat_type_name = $(this).attr("name").replace(/all-/, '');

			if ($(this).attr("checked")) {
				gd_map.show_feature_label_type(feat_type_name);
			} else {
				gd_map.hide_feature_label_type(feat_type_name);
			}
		});

	}

	if (draw_extra_features_checkbox) {
		// The "extra features" checkbox
		controls.find('input[name="extra-features"]').click(function (event) {
			if ($(this).attr("checked")) {
				gd_map.show_extra_features();
			} else {
				gd_map.hide_extra_features();
			}
		});
	}


	if (draw_table) {
		// INDIVIDUAL FEATURE TABLE
		table = GiraffeTable($, gd_map.gd, 
			$('<div></div>')
				.attr('id', random_dom_id())
				.addClass('giraffe-control-table'))

		// Insert header cells in all of the headers to make
		// the tables the right shape
		table.find('thead>tr')
			.prepend('<th>Show</th><th>Label</th>');

		// Insert show/label checkboxes in all of the body rows
		table.find('tbody>tr')
			.prepend(function (index, html) {
				var pre = '',
					start = '<td><input type="checkbox" checked="checked" name="',
					middle = '" value="',
					end = '" /></td>',
					types = [ 'show', 'label' ],
					tx;

				for (tx = 0; tx < types.length; tx++) {
					pre += start;
					pre += $(this).attr('id');
					pre += middle;
					pre += types[tx];
					pre += end;
				}

				return pre;
			});
					
		// The table checkboxes
		table.find('input[value="label"]').click(function (event) {
			var feat_id = parseInt($(this).attr("name").replace(/\D/g, ''));

			if ($(this).attr("checked")) {
				gd_map.show_feature_label(feat_id);
			} else {
				gd_map.hide_feature_label(feat_id);
			}
		});

		table.find('input[value="show"]').click(function (event) {
			var feat_id = parseInt($(this).attr("name").replace(/\D/g, '')),
				label_checkbox = $(this).parent().siblings().children('input').first();

			if ($(this).attr("checked")) {
				gd_map.show_feature(feat_id);
				label_checkbox.removeAttr("disabled");
				label_checkbox.attr("checked", "checked");
			} else {
				label_checkbox.attr("disabled", "disabled");
				gd_map.hide_feature(feat_id);
			}
		});

		controls.append(table);
	}

	$(dom).append(controls);

	return controls;
};

})();

