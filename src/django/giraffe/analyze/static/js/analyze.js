// XXX discuss
//   Feature object now exposed here, so draw.js better not change the
//   API

// Requires: jquery-ui, jquery, giraffe/blat/draw.js
// Restriction: can only have one instance of this per DOM
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
// 

(function(){window.GiraffeAnalyze = function ($,gd,options) {
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

    var viewer_seqs_per_line = 5;

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
            divs[i] = $('<div></div>');
            links[i] = $('<a pane="'+i+'" href="#">'+panes[i]+'</a>').click(function() {
                var i = $(this).attr('pane'); show(i);
            });
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
        panes = Switch_Panes(['Fasta', 'GenBank', 'Reverse Complement']);

        $(dom).append('<p>Current sequence: '+sequence.length()+' base pairs</p>')
              .append(panes.links)
              .append(panes.panes);

        $(panes.pane(0))
            .addClass('giraffe-seq').append(BioJS.fasta(sequence,name));
        $(panes.pane(1))
            .addClass('giraffe-seq').append(BioJS.genbank(sequence,name));
        $(panes.pane(2))
            .addClass('giraffe-seq').append(
                BioJS.fasta(sequence.reverse_complement(),name)
            );
        panes.hide_all();
        panes.show(0);
    }

    function map_tab(dom) {
        var dom_id_c = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_map = $('<div id="'+dom_id_c+'" class="giraffe-analyze-circular-map"></div>');
        $(dom)
            .append('<p class="giraffe-help">Click on a feature label or feature to see corresponding DNA sequence.</p>')
            .append(dom_map)
        gd.draw_circular_map({
            'map_dom_id' : dom_id_c,
            'plasmid_name' : name,
            'cutters': [1],
            'map_width' : map_width,
            'map_height' : map_height,
            'feature_click_callback' : map_feature_click_callback
        });
    }

    function digest_tab(dom) {
        panes = Switch_Panes(
            ['All Cutters',
             'Unique Cutters',
             'Non-Cutters',
             'Circular Digest',
             'Linear Digest']
        );

        $(dom)
            .append('<p class="giraffe-help">Click on a base pair number to see corresponding DNA sequence.</p>')
            .append(panes.links)
            .append(panes.panes);

        var all = cutters.all();
        var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
        for (var i in all) {
            var name = $('<label></label>').append(all[i].name());
            var cuts = [];
            var all_of_this = all[i].other_cutters();
            for (var c in all_of_this) {
                cuts.push(gd.basic_features[all_of_this[c]].cut());
            }
            for (var c in cuts) {
                cuts[c] = '<a href="#" bp="'+cuts[c]+'" class="giraffe-bp">'+cuts[c]+'</a>';
            }
            var s = $('<p>Cuts after '+cuts.join(', ')+'</p>');
            var item = $('<li></li>').append(name).append(s);
            $(list).append(item);
        }
        $(panes.pane(0)).append(list);

        var unique = cutters.unique();
        var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
        for (var i in unique) {
            var name = $('<label></label>').append(unique[i].name());
            var x = '<a href="#" bp="'+unique[i].cut()+'" class="giraffe-bp">'
                    +unique[i].cut()+'</a>';
            var s = $('<p>Cuts after '+x+'</p>');
            var item = $('<li></li>').append(name).append(s);
            $(list).append(item);
        }
        $(panes.pane(1)).append(list);

        var non = cutters.non();
        var list = $('<ul></ul>').addClass('giraffe-enzyme-list');
        for (var i in non) {
            var name = $('<label></label>').append(non[i]);
            var item = $('<li></li>').append(name);
            $(list).append(item);
        }
        $(panes.pane(2))
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
                    return gd.basic_features[a].start() -
                        gd.basic_features[b].start();
                });
                for (var c in all_of_this) {
                    cuts.push(gd.basic_features[all_of_this[c]].cut());
                }
                var digests = []
                for (var j=0; j<cuts.length; j++) {
                    if (j == 0 && !circular) {
                        var a0 = '<a href="#" class="giraffe-bp" bp="1,'+cuts[j]+'">';
                        digests.push(a0+'1-'+(cuts[j])+'</a> ('+cuts[j]+' bp)');
                    }
                    if (j+1 == cuts.length) {
                        if (circular) {
                            var a0 = '<a href="#" class="giraffe-bp" bp="'
                                     +(cuts[j]+1)+','+cuts[0]+'">';
                            digests.push(a0+(cuts[j]+1)+'-'+cuts[0]+'</a> ('+
                                         (seqlen-(cuts[j]+1)+1+cuts[0])+' bp)');
                        }
                        else {
                            var a0 = '<a href="#" class="giraffe-bp" bp="'
                                     +(cuts[j]+1)+','+seqlen+'">';
                            digests.push(a0+(cuts[j]+1)+'-'+seqlen+'</a> ('+
                                         (seqlen-(cuts[j]+1)+1)+' bp)');
                        }
                    }
                    else {
                        var a0 = '<a href="#" class="giraffe-bp" bp="'
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

        $(panes.pane(3)).append(__digest(true));
        $(panes.pane(4)).append(__digest(false));

        panes.show(0);
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

        $(dom).append(panes.links)
              .append(panes.panes);

        var starts_with = 1;
        for (var i in gd.orf_features) {
            starts_with = 0;
            var f = gd.orf_features[i];
            var s = f.clockwise_sequence();
            var t = 'ORF <a href="#" class="giraffe-bp" bp="'
                    +f.start()+','+f.end()+'">';
            if (f.clockwise()) { t += f.start()+' - '+f.end(); }
            else { t += f.end()+' - '+f.start()+' antisense'; }
            t += '</a> ('+s.length/3+' aa)';
            var title = $('<p></p>').append(t);

            var p;
            if (f.clockwise()) {
                p = new BioJS.DNASequence(s).translate();
            }
            else {
                p = new BioJS.DNASequence(s).reverse_complement().translate();
            }

            $(panes.pane(0))
                .append(title)
                .append($('<div></div>').addClass('giraffe-seq')
                                        .addClass('giraffe-left')
                                        .addClass('giraffe-protein')
                                        .append(p.format_html())
                )
                .append(
                    $(BioJS.NCBI_blastp_form(p))
                        .addClass('giraffe-ncbi-button')
                        .addClass('giraffe-left')
                        .addClass('giraffe-left-last')
                )
                .append($('<div>&nbsp;</div>').addClass('giraffe-clear'));
        }

        var p = sequence.translate();
        $(panes.pane(1)).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(p.format_html())
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var p = sequence.substring(1).translate();
        $(panes.pane(2)).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(p.format_html())
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var p = sequence.substring(2).translate();
        $(panes.pane(3)).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(p.format_html())
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var p = sequence.reverse_complement().translate();
        $(panes.pane(4)).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(p.format_html())
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var p = sequence.reverse_complement().substring(1).translate();
        $(panes.pane(5)).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(p.format_html())
        ).append(
            $(BioJS.NCBI_blastp_form(p))
                .addClass('giraffe-left')
                .addClass('giraffe-left-last')
        );

        var p = sequence.reverse_complement().substring(2).translate();
        $(panes.pane(6)).append(
            $('<div></div>').addClass('giraffe-seq')
                            .addClass('giraffe-left')
                            .addClass('giraffe-protein')
                            .append(p.format_html())
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
        var dom_id_sequence = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_tab_sequence = $('<div id="'+dom_id_sequence+'"></div>');
        var dom_id_map = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_tab_map = $('<div id="'+dom_id_map+'"></div>');
        var dom_id_blast = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_tab_blast = $('<div id="'+dom_id_blast+'"></div>');
        var dom_id_align = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_tab_align = $('<div id="'+dom_id_align+'"></div>');
        var dom_id_digest = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_tab_digest = $('<div id="'+dom_id_digest+'"></div>');
        var dom_id_translate = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_tab_translate = $('<div id="'+dom_id_translate+'"></div>');
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
    function sequence_viewer(dom) {
        var viewer = $('<div></div>').addClass('giraffe-viewer');
        var topbar = $('<div></div>').addClass('giraffe-viewer-topbar')
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
                    $(topbar).html(title);
                 })
                .mouseleave(function(){
                    $(this).removeClass('giraffe-seq-mouseover');
                    $(topbar).html("&nbsp;");
                 })
                .append(lines_10[i]);
            $(row).append(td);
            j++;
            if (j == viewer_seqs_per_line) {
                j = 0;
                var end = (i+1)*10;
                $(row).append
                    ('<td class="giraffe-bp-marker giraffe-bp-marker-right">'+end+'</td>');
            }
        }

        $(viewer)
            .append(topbar)
            .append(seq_viewer);
        $(dom).append(viewer);
    }

    // global list of td's that have span in the middle
    var global_has_span_td = [];

    function sequence_viewer_clear_highlight() {
        $('.giraffe-seq-highlight').removeClass('giraffe-seq-highlight');
        for (var i in global_has_span_td) {
            var t = $(global_has_span_td[i]).text();
            t = t.replace(/\s/g,'');
            $(global_has_span_td[i]).html(t);
        }
        global_has_span_td = [];
    }

    function sequence_viewer_bp_event() {
        $('.giraffe-bp').click(function(evt){
            $('.giraffe-bp-click-source')
                .removeClass('giraffe-bp-click-source');
            $(this).addClass('giraffe-bp-click-source');

            evt.preventDefault();

            var bpstr = $(this).attr('bp');
            var bp = bpstr.split(',');
            if (bp.length > 0) { sequence_viewer_bp_event_highlight(bp); }
        });
    }

    function sequence_viewer_bp_event_highlight(bp) {
        sequence_viewer_clear_highlight();

        for (var i in bp) { bp[i] = parseInt(bp[i]); }
        // find start bp position for the first td
        var first_td = Math.floor((bp[0]-1)/10)*10+1;
        // find start bp position of the last td
        var last_td = first_td;
        if (bp.length > 1) {
            last_td = Math.floor((bp[1]-1)/10)*10+1;
        }
        else { bp[1] = bp[0]; }

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

        var first_td_line = Math.floor(first_td/(viewer_seqs_per_line*10));
        // we want the line to scroll to to not be the first line on
        // screen, but a few lines down
        if (first_td_line > 3) { first_td_line -= 3; }
        var total_lines = Math.floor(seqlen/(viewer_seqs_per_line*10))+1;
        var table = $('.giraffe-seq-viewer table');
        var scroll = Math.floor((first_td_line/total_lines)*$(table).height());
        $('.giraffe-seq-viewer').scrollTop(scroll);
    }

    function map_feature_click_callback(feature) {
        var bp = [feature.start(),feature.end()];
        sequence_viewer_bp_event_highlight(bp);
    }

    function full_widget() {
        var dom_table = $('<table></table>');
        var dom_row = $('<tr></tr>');
        $(dom_table).append(dom_row);

        var dom_id_viewer = 'giraffe-'+Math.floor(Math.random()*100000000);
        var dom_id_tabs = 'giraffe-'+Math.floor(Math.random()*100000000);

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
    }

    full_widget();

}})();

