use strict;
use warnings;
use JSON::MaybeXS qw(encode_json decode_json);
use Data::Compare;
require "./check/solution.pl";

$SIG{__DIE__} = sub {print "{\"status\":\"error\", \"result\":\"" . substr(shift, 0, -1) . "\"}\n"; exit 0;};
$SIG{__WARN__} = sub {print "{\"status\":\"error\", \"result\":\"" . substr(shift, 0, -1) . "\"}\n"; exit 0;};

while(<>){
    my $JSON=$_;
    my $PERL = decode_json $JSON;
    if (exists $PERL->{check}){
        print "{\"status\":\"ok\", \"result\" : \"" . $PERL->{check} . "\"}\n";
        last;
    }
    my $args = $PERL->{arguments};
    my $exp = $PERL->{expected};
    if (not ref($exp)){
        if(!($exp & ~$exp)){
            if (solution(@$args) != $exp)  {
                print "{\"status\":\"failure\", \"result\":" . encode_json($PERL->{arguments}) . "}\n";
                last;
            }
        }elsif($exp & ~$exp){
            if (!(solution(@$args) eq $exp))  {
                print "{\"status\":\"failure\", \"result\":" . encode_json($PERL->{arguments}) . "}\n";
                last;
            }
        }
    }elsif (Compare(solution(@$args), $exp) != 1)  {
        print "{\"status\":\"failure\", \"result\":" . encode_json($PERL->{arguments}) . "}\n";
        last;
    }
}

