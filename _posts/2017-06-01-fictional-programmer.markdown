---
layout:     post
title:      "FICTIONAL PROGRAMMER"
subtitle:   ""
date:       2017-06-01 00:00:00
author:     "Harry"
tags:
    - 增强学习
---

<div class="row">
    <form action="#">  
        <span style="margin-left:15px">INPUT1:</span>
        <input type='text' id='input1' class='input' />
        <span style="margin-left:20px">INPUT2:</span>
        <input type='text' id='input2' class='input' />

        <input type="submit" id="submit" class="btn btn-sm btn-primary" style="margin-left:20px" />
    </form>
    <div class="col-md-8">
    <p style="font-weight:bold">POINTERS</p>
    <table style="width:60%">
        <tr>
            <th>INPUT1</th>
            <th>INPUT2</th>
            <th>OUTPUT</th>
        </tr>
        <tr>
            <td id='env0'>0</td>
            <td id='env1'>0</td>
            <td id='output'>0</td>
        </tr>
    </table>

    <p style="font-weight:bold">MEMORY</p>
    <table style="width:60%">
        <tr>
            <th>MEM0</th>
            <th>MEM1</th>
            <th>MEM2</th>
        </tr>
        <tr>
            <td id='mem0'>0</td>
            <td id='mem1'>0</td>
            <td id='mem2'>0</td>
        </tr>
    </table>

    <p style="font-weight:bold">ENVIRONMENT</p>
    <table style="text-align:center;width:100%">
        <tr>
            <th style="width:40px"></th><th>9</th><th>8</th><th>7</th><th>6</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>0</th>
        </tr>
        <tr>
            <td>INPUT 1</td>
            <td id='ptr-env0-9'></td>
            <td id='ptr-env0-8'></td>
            <td id='ptr-env0-7'></td>
            <td id='ptr-env0-6'></td>
            <td id='ptr-env0-5'></td>
            <td id='ptr-env0-4'></td>
            <td id='ptr-env0-3'></td>
            <td id='ptr-env0-2'></td>
            <td id='ptr-env0-1'></td>
            <td id='ptr-env0-0'></td>
        </tr>
        <tr>
            <td>INPUT 2</td>
            <td id='ptr-env1-9'></td>
            <td id='ptr-env1-8'></td>
            <td id='ptr-env1-7'></td>
            <td id='ptr-env1-6'></td>
            <td id='ptr-env1-5'></td>
            <td id='ptr-env1-4'></td>
            <td id='ptr-env1-3'></td>
            <td id='ptr-env1-2'></td>
            <td id='ptr-env1-1'></td>
            <td id='ptr-env1-0'></td>
        </tr>
        <tr>
            <td>OUTPUT</td>
            <td id='ptr-output-9'></td>
            <td id='ptr-output-8'></td>
            <td id='ptr-output-7'></td>
            <td id='ptr-output-6'></td>
            <td id='ptr-output-5'></td>
            <td id='ptr-output-4'></td>
            <td id='ptr-output-3'></td>
            <td id='ptr-output-2'></td>
            <td id='ptr-output-1'></td>
            <td id='ptr-output-0'></td>
        </tr>
    </table>
    </div>

    <div class="col-md-4">
        <p style="font-weight:bold">Current Function</p>
        <div style = 'margin-top:-20px;margin-bottom:10px; border-bottom:1px solid #aaa; padding-bottom:10px'>
            <div><div id='current_function'>ADD</div><div></div></div>
        </div>

        <input class='btn btn-primary' id='next_program' value='NEXT' type='button' style='width:100%' />
        <p style="font-weight:bold;margin-bottom:5px">Programs</p>
        <div id='programs' style="overflow:auto; height:520px; ">
            <div><div>ADD</div><div></div></div>
        </div>
    </div>
</div>

<script>
    window.onload=function(){ 
        step_list = []
        $("#submit").click(function(){
            
            $.ajax({
                type: "GET",
                url: "http://api.hackiey.com:8000/api/?input1="+$("#input1").val()+"&input2="+$("#input2").val(),
                xhrFields:{'Access-Control-Allow-Origin': '*'}}
            ).done(function(data){
                data = JSON.parse(data)
                console.log(data)
                for(var i = 0; i< data.input1.length; ++i){
                    $("#ptr-env0-"+[data.input1.length - i - 1]).html(parseInt(data.input1[i]))
                    $("#ptr-env1-"+[data.input2.length - i - 1]).html(parseInt(data.input2[i]))
                }

                step_list = data.step_list

            }).fail(function(jqXHR, textStatus){
                console.log ("fail: " + textStatus)
            })


            return false
        })

        var step_i = -1
        var current = {}
        $('#next_program').click(function(){

            $("#env0").html(current.env0)
            $("#env1").html(current.env1)
            $("#mem0").html(current.mem0)
            $("#mem1").html(current.mem1)
            $("#output").html(current.output)
            var step = step_list[step_i + 1]
            
            if(step){
                var output = step.current.output
                for(var j = 0; j < output.length; ++j){
                    $("#ptr-output-"+[output.length - j - 1]).html(parseInt(output[j]))
                }
                $("#programs").prepend("<div style='border-bottom:1px solid #aaa'><div>"+step.next.program+"</div><div>（"+step.next.args+"）</div></div>")
                step_i += 1

                if(step.next.program == 'PTR')
                    current['env'+step.next.args[0][1]] = parseInt($("#env"+step.next.args[0][1]).html())+1
                    
                else if(step.next.program == 'ADD_OPERATION'){
                    var sum = parseInt($("#ptr-env0-"+$("#env0").html()).html())+parseInt($("#ptr-env1-"+$("#env1").html()).html())+parseInt($("#mem0").html())
                    current['mem0'] = Math.floor(sum / 10)
                    current['mem1'] = sum % 10
                }
                if(step_list.length > (step_i+1))
                    $("#current_function").html(step_list[step_i+1].current.current_function)

                if(step_list[step_i].next.program == 'OUTPUT')
                    current.output = parseInt($("#output").html()) + 1
                    
            }
            else{
                var location = $("#output").html() - 1
                $("#ptr-output-"+location).html(current.mem1)


            }
            
        })
    
    }
    
</script>